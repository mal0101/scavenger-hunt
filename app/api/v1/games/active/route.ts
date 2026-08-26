import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiInternal } from "@/lib/types/api";
import { requireAuth } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const game = await db.game.findFirst({
      where: { status: "ACTIVE" },
      include: {
        rounds: {
          where: { status: "ACTIVE" },
          take: 1,
        },
        _count: {
          select: { teams: true, rounds: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    if (!game) {
      return apiSuccess(null, "No active game");
    }

    const activeRound = game.rounds[0];

    return apiSuccess({
      id: game.id,
      title: game.title,
      description: game.description,
      status: game.status,
      max_rounds: game.max_rounds,
      round_duration: game.round_duration,
      elimination_pct: game.elimination_pct,
      team_count: game._count.teams,
      round_count: game._count.rounds,
      current_round: game.current_round,
      current_round_id: activeRound?.id ?? null,
    });
  } catch (error) {
    console.error("Get active game error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to get active game");
  }
}
