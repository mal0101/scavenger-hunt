import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal, apiConflict } from "@/lib/types/api";
import { teamSchema } from "@/lib/utils/validation";
import { generateInviteCode } from "@/lib/utils/crypto";
import { requirePlayer } from "@/lib/auth/guard";
import { GAME_CONSTANTS } from "@/lib/utils/constants";

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = teamSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid team data", "VALIDATION_ERROR");
    }

    const { team_name, invite_code } = parsed.data;

    const existingPlayer = await db.player.findUnique({
      where: { user_id: auth.sub },
    });

    if (existingPlayer?.team_id) {
      return apiConflict("You are already in a team");
    }

    if (!existingPlayer) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    if (invite_code) {
      const team = await db.team.findUnique({
        where: { invite_code },
        include: { players: true },
      });

      if (!team) {
        return apiError("Invalid invite code", "INVALID_CODE");
      }

      if (team.eliminated) {
        return apiError("This team has been eliminated", "TEAM_ELIMINATED");
      }

      if (team.players.length >= GAME_CONSTANTS.PLAYERS_PER_TEAM) {
        return apiError(
          `Team is full (max ${GAME_CONSTANTS.PLAYERS_PER_TEAM} players)`,
          "TEAM_FULL",
          409
        );
      }

      await db.player.update({
        where: { user_id: auth.sub },
        data: { team_id: team.id },
      });

      return apiSuccess(
        {
          id: team.id,
          name: team.name,
          invite_code: team.invite_code,
          member_count: team.players.length + 1,
        },
        "Joined team successfully"
      );
    }

    const teamCount = await db.team.count({
      where: { game_id: existingPlayer.game_id },
    });

    if (teamCount >= GAME_CONSTANTS.MAX_TEAMS_PER_GAME) {
      return apiError(
        `Game has reached the maximum of ${GAME_CONSTANTS.MAX_TEAMS_PER_GAME} teams`,
        "MAX_TEAMS_REACHED",
        409
      );
    }

    let code = generateInviteCode();
    let codeExists = await db.team.findUnique({
      where: { invite_code: code },
      select: { id: true },
    });

    let attempts = 0;
    while (codeExists && attempts < 10) {
      code = generateInviteCode();
      codeExists = await db.team.findUnique({
        where: { invite_code: code },
        select: { id: true },
      });
      attempts++;
    }

    if (codeExists) {
      return apiInternal("Failed to generate a unique invite code");
    }

    const team = await db.team.create({
      data: {
        name: team_name,
        invite_code: code,
        game_id: existingPlayer.game_id,
      },
    });

    await db.player.update({
      where: { user_id: auth.sub },
      data: { team_id: team.id },
    });

    return apiSuccess(
      {
        id: team.id,
        name: team.name,
        invite_code: team.invite_code,
        member_count: 1,
      },
      "Team created successfully"
    );
  } catch (error) {
    console.error("Team operation error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to create or join team");
  }
}
