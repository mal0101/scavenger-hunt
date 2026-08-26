import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiInternal } from "@/lib/types/api";
import { requireAuth } from "@/lib/auth/guard";
import { redis } from "@/lib/db/redis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id: gameId } = await params;

    const leaderboardKey = `leaderboard:${gameId}`;
    const entries = await redis.zrange(leaderboardKey, 0, -1, {
      withScores: true,
      rev: true,
    });

    const teams: Array<{
      rank: number;
      team_id: string;
      name: string;
      score: number;
      eliminated: boolean;
      member_count: number;
    }> = [];

    let rank = 1;
    for (let i = 0; i < entries.length; i += 2) {
      const teamId = entries[i] as string;
      const score = entries[i + 1] as number;

      const team = await db.team.findUnique({
        where: { id: teamId },
        include: { players: true },
      });

      if (team) {
        teams.push({
          rank,
          team_id: team.id,
          name: team.name,
          score,
          eliminated: team.eliminated,
          member_count: team.players.length,
        });
        rank++;
      }
    }

    return apiSuccess({
      game_id: gameId,
      teams,
      total_teams: teams.length,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to get leaderboard");
  }
}
