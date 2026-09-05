import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { requireAuth } from "@/lib/auth/guard";
import { getTeamRank } from "@/lib/game/leaderboard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const player = await db.player.findUnique({
      where: { user_id: auth.sub },
      include: {
        user: { select: { id: true, username: true, nickname: true, role: true } },
        team: {
          select: {
            id: true,
            name: true,
            invite_code: true,
            total_score: true,
            eliminated: true,
            captain_id: true,
            game_id: true,
          },
        },
      },
    });

    if (!player) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    const [passedChallenges, teamRank] = await Promise.all([
      db.scan.count({ where: { player_id: player.id } }),
      player.team
        ? getTeamRank(player.team.game_id, player.team.id)
        : Promise.resolve(null),
    ]);

    return apiSuccess({
      id: player.id,
      user_id: player.user.id,
      username: player.user.username,
      nickname: player.user.nickname,
      role: player.user.role,
      game_id: player.game_id,
      total_score: player.total_score,
      status: player.status,
      passed_challenges: passedChallenges,
      team_rank: teamRank,
      team: player.team,
    });
  } catch (error) {
    console.error("Get player error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to get player profile");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { nickname } = body;

    if (!nickname || typeof nickname !== "string" || nickname.length < 1 || nickname.length > 50) {
      return apiError("Invalid nickname", "VALIDATION_ERROR");
    }

    const user = await db.user.update({
      where: { id: auth.sub },
      data: { nickname },
    });

    return apiSuccess(
      { id: user.id, nickname: user.nickname },
      "Profile updated"
    );
  } catch (error) {
    console.error("Update player error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to update player profile");
  }
}
