import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { requireAuth } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const player = await db.player.findUnique({
      where: { user_id: auth.sub },
      include: {
        user: { select: { id: true, nickname: true, role: true } },
        team: { select: { id: true, name: true, invite_code: true, total_score: true } },
      },
    });

    if (!player) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    return apiSuccess({
      id: player.user.id,
      nickname: player.user.nickname,
      role: player.user.role,
      total_score: player.total_score,
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
