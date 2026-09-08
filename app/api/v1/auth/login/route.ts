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

    const isPhoneLike = /^\+?[0-9]{8,15}$/.test(username);
    const user = isPhoneLike
      ? await db.user.findFirst({
          where: { phone_number: username },
        })
      : await db.user.findUnique({ where: { username } });
    if (!user) {
      return apiError(
        "Invalid username or phone number or password",
        "INVALID_CREDENTIALS",
        401
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return apiError(
        "Invalid username or phone number or password",
        "INVALID_CREDENTIALS",
        401
      );
    }

    if (user.role === "PLAYER") {
      // Attach the player to the current hunt whether it is running (ACTIVE)
      // or staged for launch (PENDING). The seed pre-provisions dev players
      // the same way, so login must behave consistently pre- and post-launch;
      // a player without a profile would otherwise 404 every player API.
      const targetGame = await db.game.findFirst({
        where: { status: { in: ["ACTIVE", "PENDING"] } },
        orderBy: { created_at: "desc" },
      });
      if (targetGame) {
        await db.player.upsert({
          where: { user_id: user.id },
          update: {},
          create: {
            user_id: user.id,
            game_id: targetGame.id,
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