import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiCreated, apiError, apiInternal } from "@/lib/types/api";
import { gameSchema } from "@/lib/utils/validation";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const games = await db.game.findMany({
      include: {
        _count: {
          select: { teams: true, rounds: true },
        },
        rounds: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
      orderBy: { created_at: "desc" },
    });

    return apiSuccess(
      games.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        status: g.status,
        max_rounds: g.max_rounds,
        round_duration: g.round_duration,
        elimination_pct: g.elimination_pct,
        team_count: g._count.teams,
        round_count: g._count.rounds,
        current_round: g.rounds[0]?.round_number ?? 0,
        created_at: g.created_at,
      }))
    );
  } catch (error) {
    console.error("List games error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to list games");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = gameSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid game data", "VALIDATION_ERROR");
    }

    const game = await db.game.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        max_rounds: parsed.data.max_rounds,
        round_duration: parsed.data.round_duration,
        elimination_pct: parsed.data.elimination_pct,
        created_by: auth.sub,
      },
    });

    return apiCreated(
      {
        id: game.id,
        title: game.title,
        status: game.status,
      },
      "Game created successfully"
    );
  } catch (error) {
    console.error("Create game error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to create game");
  }
}
