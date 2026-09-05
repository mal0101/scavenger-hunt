import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiError, apiInternal } from "@/lib/types/api";
import { credentialsSchema } from "@/lib/utils/validation";
import { verifyPassword } from "@/lib/auth/passwords";
import { issueSession } from "@/lib/auth/session";
import { setAuthCookies } from "@/lib/auth/cookies";
import { checkRateLimit, loginLimiter } from "@/lib/utils/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = credentialsSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid username or password format", "VALIDATION_ERROR");
    }

    const { username, password } = parsed.data;

    const rateLimitResult = await checkRateLimit(
      loginLimiter,
      `login:${username.toLowerCase()}`,
      { failClosed: true }
    );
    if (!rateLimitResult.success) {
      return apiError(
        "Too many login attempts. Please try again later.",
        "RATE_LIMITED",
        429
      );
    }

    const user = await db.user.findUnique({ where: { username } });
    if (!user) {
      return apiError("Invalid username or password", "INVALID_CREDENTIALS", 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return apiError("Invalid username or password", "INVALID_CREDENTIALS", 401);
    }

    if (user.role === "PLAYER") {
      const activeGame = await db.game.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { created_at: "desc" },
      });
      if (activeGame) {
        await db.player.upsert({
          where: { user_id: user.id },
          update: {},
          create: {
            user_id: user.id,
            game_id: activeGame.id,
            team_id: null,
            total_score: 0,
            status: "ACTIVE",
          },
        });
      }
    }

    const session = await issueSession(user);

    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          nickname: user.nickname,
        },
      },
      timestamp: new Date().toISOString(),
    });

    setAuthCookies(
      response,
      session.accessToken,
      session.refreshToken,
      session.accessMaxAge,
      session.refreshMaxAge
    );

    return response;
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to sign in");
  }
}