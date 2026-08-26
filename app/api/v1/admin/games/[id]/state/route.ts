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

    const targetState = getTargetState(game.status, action);

    if (action === "start") {
      const roundNumber = game.current_round + 1;

      await db.$transaction([
        db.game.update({
          where: { id },
          data: {
            status: "ACTIVE",
            current_round: roundNumber,
            started_at: game.started_at ?? new Date(),
          },
        }),
        db.round.create({
          data: {
            game_id: id,
            round_number: roundNumber,
            status: "ACTIVE",
            started_at: new Date(),
          },
        }),
      ]);

      await publishEvent(id, "state", {
        type: "round_started",
        round_number: roundNumber,
      });
    } else if (action === "eliminate") {
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
        select: { id: true, total_score: true },
      });

      const eliminatedIds = getEliminatedTeams(
        teams.map((t) => ({ id: t.id, total_score: t.total_score })),
        game.elimination_pct
      );

      if (eliminatedIds.length > 0) {
        await db.team.updateMany({
          where: { id: { in: eliminatedIds } },
          data: { eliminated: true },
        });
      }

      const newStatus = targetState === "ACTIVE" ? "ACTIVE" : "ELIMINATING";
      await db.game.update({
        where: { id },
        data: { status: newStatus as GameStatus },
      });

      await publishEvent(id, "state", {
        type: "elimination",
        eliminated_teams: eliminatedIds,
      });
    } else if (action === "finish") {
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

    return apiSuccess(
      {
        game_id: id,
        action,
        new_status: targetState,
      },
      `Game ${action} successful`
    );
  } catch (error) {
    console.error("State transition error:", error);
    return apiInternal("Failed to transition game state");
  }
}
