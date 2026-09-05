import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal, apiConflict } from "@/lib/types/api";
import { teamSchema } from "@/lib/utils/validation";
import { generateInviteCode } from "@/lib/utils/crypto";
import { requirePlayer } from "@/lib/auth/guard";
import { GAME_CONSTANTS } from "@/lib/utils/constants";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const player = await db.player.findUnique({
      where: { user_id: auth.sub },
      select: { id: true, team_id: true },
    });

    if (!player) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    if (!player.team_id) {
      return apiSuccess({ team: null });
    }

    const team = await db.team.findUnique({
      where: { id: player.team_id },
      include: {
        players: {
          select: {
            id: true,
            total_score: true,
            status: true,
            user: { select: { id: true, username: true, nickname: true } },
          },
        },
      },
    });

    if (!team) {
      return apiSuccess({ team: null });
    }

    return apiSuccess({
      team: {
        id: team.id,
        name: team.name,
        invite_code: team.invite_code,
        total_score: team.total_score,
        eliminated: team.eliminated,
        game_id: team.game_id,
        captain_id: team.captain_id,
        is_captain: team.captain_id === player.id,
        member_count: team.players.length,
        members: team.players.map((p) => ({
          id: p.id,
          user_id: p.user.id,
          username: p.user.username,
          nickname: p.user.nickname,
          total_score: p.total_score,
          status: p.status,
          is_captain: p.id === team.captain_id,
          is_me: p.id === player.id,
        })),
      },
    });
  } catch (error) {
    console.error("Get team error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to get team");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const player = await db.player.findUnique({
      where: { user_id: auth.sub },
      select: { id: true, team_id: true },
    });

    if (!player) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    if (!player.team_id) {
      return apiError("You are not in a team", "NOT_IN_TEAM", 400);
    }

    const team = await db.team.findUnique({
      where: { id: player.team_id },
      include: { players: { select: { id: true } } },
    });

    if (!team) {
      return apiError("Team not found", "NOT_FOUND", 404);
    }

    const isCaptain = team.captain_id === player.id;

    if (isCaptain && team.players.length > 1) {
      return apiError(
        "Captains cannot leave while the team has other members; pass leadership first",
        "CAPTAIN_CANNOT_LEAVE",
        409
      );
    }

    await db.player.update({
      where: { id: player.id },
      data: { team_id: null },
    });

    if (team.players.length === 1) {
      await db.team.delete({ where: { id: team.id } });
    }

    return apiSuccess({ left: true }, "Left team successfully");
  } catch (error) {
    console.error("Leave team error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to leave team");
  }
}

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
        captain_id: existingPlayer.id,
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
