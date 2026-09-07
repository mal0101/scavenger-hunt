import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiInternal } from "@/lib/types/api";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const gameId = url.searchParams.get("game_id");

    const where = gameId ? { game_id: gameId } : {};

    const teams = await db.team.findMany({
      where,
      include: {
        game: { select: { id: true, title: true } },
        players: { select: { id: true, user_id: true, total_score: true } },
      },
      orderBy: { total_score: "desc" },
    });

    return apiSuccess(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        invite_code: t.invite_code,
        game_id: t.game_id,
        game_title: t.game.title,
        total_score: t.total_score,
        eliminated: t.eliminated,
        member_count: t.players.length,
        players: t.players.map((p) => ({
          id: p.id,
          total_score: p.total_score,
        })),
      }))
    );
  } catch (error) {
    console.error("List teams error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to list teams");
  }
}
