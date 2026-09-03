import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal, apiNotFound } from "@/lib/types/api";
import { stateTransitionSchema } from "@/lib/utils/validation";
import { canTransition, getTargetState, getEliminatedTeams } from "@/lib/game/engine";
import { publishEvent } from "@/lib/db/pubsub";
import { requireMentor } from "@/lib/auth/guard";
import type { GameStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const body = await request.json();
    const parsed = stateTransitionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid action", "VALIDATION_ERROR");
    }

    const { action } = parsed.data;

    const game = await db.game.findUnique({ where: { id } });
    if (!game) return apiNotFound("Game not found");

    if (!canTransition(game.status, action)) {
      return apiError(
        `Cannot ${action} from state ${game.status}`,
        "INVALID_TRANSITION"
      );
    }

    // ── START (PENDING → ACTIVE) ────────────────────────────────
    if (action === "start") {
      const roundNumber = game.current_round + 1;

      const existingRound = await db.round.findFirst({
        where: { game_id: id, round_number: roundNumber },
        select: { id: true },
      });

      await db.$transaction([
        db.game.update({
          where: { id },
          data: {
            status: "ACTIVE",
            current_round: roundNumber,
            started_at: game.started_at ?? new Date(),
          },
        }),
      ]);

      if (existingRound) {
        await db.round.update({
          where: { id: existingRound.id },
          data: { status: "ACTIVE", started_at: new Date() },
        });
      } else {
        await db.round.create({
          data: {
            game_id: id,
            round_number: roundNumber,
            status: "ACTIVE",
            started_at: new Date(),
          },
        });
      }

      await publishEvent(id, "state", {
        type: "round_started",
        round_number: roundNumber,
      });
    }

    // ── NEXT ROUND (ELIMINATING → ACTIVE) ───────────────────────
    else if (action === "next_round") {
      const roundNumber = game.current_round + 1;

      if (roundNumber > game.max_rounds) {
        return apiError(
          `All ${game.max_rounds} rounds are complete. End the game or reset it.`,
          "MAX_ROUNDS_REACHED"
        );
      }

      const existingRound = await db.round.findFirst({
        where: { game_id: id, round_number: roundNumber },
        select: { id: true },
      });

      await db.$transaction([
        db.game.update({
          where: { id },
          data: {
            status: "ACTIVE",
            current_round: roundNumber,
          },
        }),
      ]);

      if (existingRound) {
        await db.round.update({
          where: { id: existingRound.id },
          data: { status: "ACTIVE", started_at: new Date() },
        });
      } else {
        await db.round.create({
          data: {
            game_id: id,
            round_number: roundNumber,
            status: "ACTIVE",
            started_at: new Date(),
          },
        });
      }

      await publishEvent(id, "state", {
        type: "round_started",
        round_number: roundNumber,
      });
    }

    // ── ELIMINATE (ACTIVE → ELIMINATING) ────────────────────────
    else if (action === "eliminate") {
      const activeRound = await db.round.findFirst({
        where: { game_id: id, status: "ACTIVE" },
      });

      if (activeRound) {
        await db.round.update({
          where: { id: activeRound.id },
          data: { status: "COMPLETED", ended_at: new Date() },
        });
      }

      const teams = await db.team.findMany({
        where: { game_id: id },
        select: { id: true, total_score: true, eliminated: true },
      });

      const eliminatedIds = getEliminatedTeams(
        teams.map((t) => ({ id: t.id, total_score: t.total_score })),
        game.elimination_pct
      );

      const newlyEliminated = eliminatedIds.filter(
        (tid) => !teams.find((t) => t.id === tid)?.eliminated
      );

      if (newlyEliminated.length > 0) {
        await db.team.updateMany({
          where: { id: { in: newlyEliminated } },
          data: { eliminated: true },
        });
      }

      await db.game.update({
        where: { id },
        data: { status: "ELIMINATING" },
      });

      await publishEvent(id, "state", {
        type: "elimination",
        eliminated_teams: newlyEliminated,
      });
    }

    // ── FINISH (ELIMINATING → FINISHED) ─────────────────────────
    else if (action === "finish") {
      const activeRound = await db.round.findFirst({
        where: { game_id: id, status: "ACTIVE" },
      });

      if (activeRound) {
        await db.round.update({
          where: { id: activeRound.id },
          data: { status: "COMPLETED", ended_at: new Date() },
        });
      }

      await db.game.update({
        where: { id },
        data: { status: "FINISHED", finished_at: new Date() },
      });

      await publishEvent(id, "state", {
        type: "game_finished",
      });
    }

    // ── RESET (FINISHED → PENDING) ──────────────────────────────
    else if (action === "reset") {
      await db.$transaction([
        db.game.update({
          where: { id },
          data: {
            status: "PENDING",
            current_round: 0,
            started_at: null,
            finished_at: null,
          },
        }),
        db.round.updateMany({
          where: { game_id: id },
          data: { status: "COMPLETED" },
        }),
      ]);

      await publishEvent(id, "state", {
        type: "game_reset",
      });
    }

    const refreshed = await db.game.findUnique({ where: { id } });

    return apiSuccess(
      {
        game_id: id,
        action,
        new_status: refreshed?.status ?? nextTargetStatus(game.status, action),
        current_round: refreshed?.current_round ?? 0,
      },
      `Game ${action} successful`
    );
  } catch (error) {
    console.error("State transition error:", error);
    return apiInternal("Failed to transition game state");
  }
}

function nextTargetStatus(
  current: GameStatus,
  action: string
): GameStatus | null {
  return getTargetState(current, action);
}
