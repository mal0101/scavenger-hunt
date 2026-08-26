import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { scanSchema } from "@/lib/utils/validation";
import { validateQrCode } from "@/lib/qr/validator";
import { calculateScanScore } from "@/lib/game/engine";
import { publishEvent } from "@/lib/db/pubsub";
import { redis } from "@/lib/db/redis";
import { checkRateLimit, scanLimiter } from "@/lib/utils/rate-limiter";
import { requirePlayer } from "@/lib/auth/guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const rateLimitResult = await checkRateLimit(scanLimiter, auth.sub);
    if (!rateLimitResult.success) {
      return apiError("Too many scans. Please wait.", "RATE_LIMITED", 429);
    }

    const { id: gameId } = await params;
    const body = await request.json();
    const parsed = scanSchema.safeParse({ ...body, game_id: gameId });

    if (!parsed.success) {
      return apiError("Invalid scan data", "VALIDATION_ERROR");
    }

    const { qr_data } = parsed.data;

    const validation = validateQrCode(qr_data, gameId);
    if (!validation.valid) {
      return apiError(
        `QR code invalid: ${validation.error}`,
        "QR_VALIDATION_FAILED"
      );
    }

    const { payload } = validation;

    const player = await db.player.findUnique({
      where: { user_id: auth.sub },
    });

    if (!player) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    if (!player.team_id) {
      return apiError("You must be in a team to scan", "NO_TEAM");
    }

    const existingScan = await db.scan.findFirst({
      where: {
        player_id: player.id,
        index_id: payload!.index_id,
      },
    });

    if (existingScan) {
      return apiError("You have already scanned this index", "ALREADY_SCANNED");
    }

    const game = await db.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== "ACTIVE") {
      return apiError("Game is not active", "GAME_NOT_ACTIVE");
    }

    const activeRound = await db.round.findFirst({
      where: { game_id: gameId, status: "ACTIVE" },
    });

    if (!activeRound) {
      return apiError("No active round", "NO_ACTIVE_ROUND");
    }

    const index = await db.index.findUnique({
      where: { id: payload!.index_id },
    });

    if (!index) {
      return apiError("Index not found", "INDEX_NOT_FOUND");
    }

    const elapsed = Math.floor(
      (Date.now() - activeRound.started_at!.getTime()) / 1000
    );
    const remaining = Math.max(0, game.round_duration - elapsed);
    const score = calculateScanScore(
      index.points,
      remaining,
      game.round_duration
    );

    const scan = await db.scan.create({
      data: {
        player_id: player.id,
        team_id: player.team_id,
        index_id: payload!.index_id,
        game_id: gameId,
        round_id: activeRound.id,
        points_earned: score,
      },
    });

    await db.player.update({
      where: { id: player.id },
      data: { total_score: { increment: score } },
    });

    await db.team.update({
      where: { id: player.team_id },
      data: { total_score: { increment: score } },
    });

    const team = await db.team.findUnique({ where: { id: player.team_id } });
    if (team) {
      await redis.zadd(`leaderboard:${gameId}`, {
        score: team.total_score,
        member: team.id,
      });
    }

    await publishEvent(gameId, "leaderboard", {
      type: "scan",
      team_id: player.team_id,
      score,
      total_score: team?.total_score ?? 0,
    });

    return apiSuccess(
      {
        scan_id: scan.id,
        index: {
          id: index.id,
          label: index.label,
          type: index.enigma_type,
        },
        points_earned: score,
        team_total: team?.total_score ?? 0,
      },
      "Scan recorded successfully"
    );
  } catch (error) {
    console.error("Scan error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to process scan");
  }
}
