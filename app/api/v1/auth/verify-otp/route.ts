import { NextRequest } from "next/server";
import { verifyOtp, invalidateOtp } from "@/lib/auth/otp";
import {
  signAccessToken,
  signRefreshToken,
  getAccessExpiry,
  getRefreshExpiry,
} from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import { otpSchema } from "@/lib/utils/validation";
import { db } from "@/lib/db/postgres";
import { apiError, apiInternal } from "@/lib/types/api";
import { checkRateLimit, otpVerifyLimiter } from "@/lib/utils/rate-limiter";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = otpSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid OTP format", "VALIDATION_ERROR");
    }

    const { phone_number, code } = parsed.data;

    const rateLimitResult = await checkRateLimit(otpVerifyLimiter, phone_number, { failClosed: true });
    if (!rateLimitResult.success) {
      return apiError("Too many failed attempts. Request a new code.", "RATE_LIMITED", 429);
    }

    const isValid = await verifyOtp(phone_number, code);
    if (!isValid) {
      return apiError("Invalid or expired OTP code", "OTP_INVALID");
    }

    await invalidateOtp(phone_number);

    let user = await db.user.findUnique({
      where: { phone_number },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await db.user.create({
        data: {
          phone_number,
          role: "PLAYER",
        },
      });
    }

    if (user.role === "PLAYER" && isNewUser) {
      const activeGame = await db.game.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { created_at: "desc" },
      });

      if (activeGame) {
        await db.player.create({
          data: {
            user_id: user.id,
            game_id: activeGame.id,
            total_score: 0,
            status: "ACTIVE",
          },
        });
      }
    }

    const accessToken = await signAccessToken(
      user.id,
      user.role,
      user.phone_number
    );
    const refreshToken = await signRefreshToken(
      user.id,
      user.role,
      user.phone_number
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Authentication successful",
        data: {
          user: {
            id: user.id,
            nickname: user.nickname,
            role: user.role,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

    setAuthCookies(
      response,
      accessToken,
      refreshToken,
      getAccessExpiry(),
      getRefreshExpiry()
    );

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to verify OTP");
  }
}
