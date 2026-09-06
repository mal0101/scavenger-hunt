import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { scanSchema } from "@/lib/utils/validation";
import { validateQrCode } from "@/lib/qr/validator";
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

    let player = await db.player.findUnique({
      where: { user_id: auth.sub },
    });

    if (!player) {
      player = await db.player.create({
        data: {
          user_id: auth.sub,
          game_id: gameId,
          total_score: 0,
          status: "ACTIVE",
        },
      });
    }

    if (!player.team_id) {
      return apiError("You must be in a team to scan", "NO_TEAM");
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

    if (payload!.round_id !== activeRound.id) {
      return apiError("QR code is not valid for the current round", "QR_ROUND_MISMATCH");
    }

    const qrCode = await db.qrCode.findUnique({
      where: { id: payload!.code_id },
    });

    if (
      !qrCode ||
      qrCode.index_id !== payload!.index_id ||
      qrCode.game_id !== gameId ||
      qrCode.round_id !== activeRound.id
    ) {
      return apiError("QR code does not match a registered checkpoint", "QR_UNKNOWN_CODE");
    }

    if (qrCode.status !== "ACTIVE") {
      return apiError("This QR code has already been fully claimed", "QR_DEPLETED");
    }

    const index = await db.index.findUnique({
      where: { id: payload!.index_id },
    });

    if (!index) {
      return apiError("Index not found", "INDEX_NOT_FOUND");
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

    const isTrap = index.enigma_type === "trap";

    // Traps: create a pending scan whose points are only settled once the
    // player submits an answer via POST /games/:id/trap/:scanId/answer. The QR
    // pool is untouched so other teams can still run the same trap.
    if (isTrap) {
      const scan = await db.scan.create({
        data: {
          player_id: player.id,
          team_id: player.team_id,
          index_id: payload!.index_id,
          game_id: gameId,
          round_id: activeRound.id,
          points_earned: 0,
          resolved: false,
        },
      });

      return apiSuccess(
        {
          scan_id: scan.id,
          index: {
            id: index.id,
            label: index.label,
            type: index.enigma_type,
          },
          points_earned: 0,
          pending: true,
          question: index.question ?? null,
          at_risk: index.points,
          team_total: player.total_score,
        },
        "Trap activated"
      );
    }

    // Reduced pool model: the FIRST scan pays the full original value, but
    // from the SECOND scan onward every claim pays the reduced value (33% off
    // the ORIGINAL points), and stays at that reduced rate for all subsequent
    // scans — it does not keep shrinking. Rewriting the pool also makes it
    // clear to re-scanners that the lower value is now the current one.
    const reduced = Math.max(1, Math.round(qrCode.points * 0.67));

    const score =
      qrCode.pool_value === qrCode.points ? qrCode.points : reduced;

    // Set the shared pool to the reduced value (first scan only touches pool
    // bookkeeping, not the value paid out), so the value is durable for any
    // later scan.
    await db.qrCode.updateMany({
      where: { id: qrCode.id, status: "ACTIVE" },
      data: {
        pool_value: reduced,
        ...(qrCode.pool_value === qrCode.points
          ? { first_scanned_at: new Date() }
          : {}),
      },
    });

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
      try {
        await redis.zadd(`leaderboard:${gameId}`, {
          score: team.total_score,
          member: team.id,
        });
      } catch (error) {
        console.warn(
          `[Scan] Redis leaderboard sync skipped for team ${team.id}:`,
          error instanceof Error ? error.message : "unknown"
        );
      }
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
