import { NextRequest } from "next/server";
import { apiSuccess, apiInternal } from "@/lib/types/api";
import { requireAuth } from "@/lib/auth/guard";
import { getLeaderboardRows } from "@/lib/game/leaderboard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id: gameId } = await params;

    const rows = await getLeaderboardRows(gameId);

    return apiSuccess({
      game_id: gameId,
      teams: rows.map((r) => ({
        rank: r.rank,
        team_id: r.teamId,
        name: r.name,
        score: r.score,
        eliminated: r.eliminated,
        member_count: r.memberCount,
      })),
      total_teams: rows.length,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to get leaderboard");
  }
}
