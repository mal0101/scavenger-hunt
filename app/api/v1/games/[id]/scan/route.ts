import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { scanSchema, parseAnswerOptions } from "@/lib/utils/validation";
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

    if (player.game_id !== gameId) {
      return apiError(
        "This account is not registered for this game",
        "GAME_MISMATCH"
      );
    }

    if (!player.team_id) {
      return apiError("You must be in a team to scan", "NO_TEAM");
    }

    const teamId = player.team_id;

    const teamRow = await db.team.findUnique({
      where: { id: player.team_id },
      select: { eliminated: true },
    });

    if (teamRow?.eliminated) {
      return apiError("This team has been eliminated and cannot scan", "TEAM_ELIMINATED");
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

    const qrCode = await db.qrCode.findUnique({
      where: { id: payload!.code_id },
    });

    if (
      !qrCode ||
      qrCode.index_id !== payload!.index_id ||
      qrCode.game_id !== gameId
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

    // Sequential course: a checkpoint with sequence_order > 0 only unlocks once
    // the team has scanned every earlier step (any member's scan counts). This
    // keeps a single hunt ordered end-to-end while leaving unsequenced indexes
    // scannable at any time.
    const targetOrder = index.sequence_order ?? 0;
    if (targetOrder > 0) {
      const priorSteps = await db.scan.findMany({
        where: {
          team_id: teamId,
          index: { sequence_order: { gt: 0, lt: targetOrder } },
        },
        distinct: ["index_id"],
        select: { index_id: true },
      });

      if (priorSteps.length < targetOrder - 1) {
        return apiError(
          "Previous checkpoint not scanned yet",
          "SEQUENCE_LOCKED"
        );
      }
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
          answer_options: parseAnswerOptions(index.answer_options),
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

    // All writes that settle a scan commit atomically: decrementing the QR
    // pool, recording the scan, and crediting player + team scores happen in
    // a single transaction. The pool claim is atomic too — only the scan that
    // observes the pool at its original value may take the full payout and
    // stamp first_scanned_at; a concurrent first scan loses the claim and is
    // paid the reduced value instead (the full value is never paid twice).
    const [score, scan, team] = await db.$transaction(async (tx) => {
      const claim = await tx.qrCode.updateMany({
        where: { id: qrCode.id, status: "ACTIVE", pool_value: qrCode.points },
        data: {
          pool_value: reduced,
          first_scanned_at: new Date(),
        },
      });

      const earned = claim.count === 1 ? qrCode.points : reduced;

      const created = await tx.scan.create({
        data: {
          player_id: player.id,
          team_id: teamId,
          index_id: payload!.index_id,
          game_id: gameId,
          round_id: activeRound.id,
          points_earned: earned,
        },
      });

      await tx.player.update({
        where: { id: player.id },
        data: { total_score: { increment: earned } },
      });

      const updated = await tx.team.update({
        where: { id: teamId },
        data: { total_score: { increment: earned } },
      });

      return [earned, created, updated] as const;
    });

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

    await publishEvent(gameId, "leaderboard", {
      type: "scan",
      team_id: player.team_id,
      score,
      total_score: team.total_score,
    });

    return apiSuccess(
      {
        scan_id: scan.id,
        index: {
          id: index.id,
          label: index.label,
          type: index.enigma_type,
          sequence_order: index.sequence_order,
        },
        points_earned: score,
        hint: index.hint ?? null,
        team_total: team.total_score,
      },
      "Scan recorded successfully"
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("You have already scanned this index", "ALREADY_SCANNED");
    }
    console.error("Scan error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to process scan");
  }
}
