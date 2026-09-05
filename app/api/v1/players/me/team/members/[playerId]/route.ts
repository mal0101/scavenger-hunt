import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal, apiForbidden, apiConflict } from "@/lib/types/api";
import { requirePlayer } from "@/lib/auth/guard";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const captain = await db.player.findUnique({
      where: { user_id: auth.sub },
      select: { id: true, team_id: true },
    });

    if (!captain || !captain.team_id) {
      return apiError("You are not in a team", "NOT_IN_TEAM", 400);
    }

    const team = await db.team.findUnique({
      where: { id: captain.team_id },
      select: { captain_id: true },
    });

    if (!team) {
      return apiError("Team not found", "NOT_FOUND", 404);
    }

    if (team.captain_id !== captain.id) {
      return apiForbidden("Only the team captain can remove members");
    }

    const target = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, team_id: true, user_id: true },
    });

    if (!target) {
      return apiError("Player not found", "NOT_FOUND", 404);
    }

    if (target.team_id !== captain.team_id) {
      return apiError("Player is not on your team", "NOT_YOUR_TEAM", 400);
    }

    if (target.id === captain.id) {
      return apiConflict("Captains cannot remove themselves");
    }

    await db.player.update({
      where: { id: target.id },
      data: { team_id: null },
    });

    return apiSuccess(
      { removed_player_id: target.id },
      "Member removed successfully"
    );
  } catch (error) {
    console.error("Remove team member error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to remove team member");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const captain = await db.player.findUnique({
      where: { user_id: auth.sub },
      select: { id: true, team_id: true },
    });

    if (!captain || !captain.team_id) {
      return apiError("You are not in a team", "NOT_IN_TEAM", 400);
    }

    const team = await db.team.findUnique({
      where: { id: captain.team_id },
      select: { captain_id: true },
    });

    if (!team) {
      return apiError("Team not found", "NOT_FOUND", 404);
    }

    if (team.captain_id !== captain.id) {
      return apiForbidden("Only the team captain can transfer leadership");
    }

    const target = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, team_id: true },
    });

    if (!target) {
      return apiError("Player not found", "NOT_FOUND", 404);
    }

    if (target.team_id !== captain.team_id) {
      return apiError("Player is not on your team", "NOT_YOUR_TEAM", 400);
    }

    if (target.id === captain.id) {
      return apiConflict("You already lead this team");
    }

    await db.team.update({
      where: { id: captain.team_id },
      data: { captain_id: target.id },
    });

    return apiSuccess(
      { captain_id: target.id },
      "Leadership transferred successfully"
    );
  } catch (error) {
    console.error("Transfer leadership error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to transfer leadership");
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}