import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  getAccessExpiry,
  getRefreshExpiry,
} from "@/lib/auth/jwt";
import { setAuthCookies, getRefreshTokenFromRequest } from "@/lib/auth/cookies";
import { apiUnauthorized } from "@/lib/types/api";
import { redis } from "@/lib/db/redis";
import { checkRateLimit, refreshLimiter } from "@/lib/utils/rate-limiter";

const REFRESH_TOKEN_FAMILY_PREFIX = "refresh_token:";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromRequest(request);

    if (!refreshToken) {
      return apiUnauthorized("No refresh token provided");
    }

    const rateLimitResult = await checkRateLimit(refreshLimiter, refreshToken.slice(-32));
    if (!rateLimitResult.success) {
      return apiUnauthorized("Too many refresh attempts");
    }

    const payload = await verifyRefreshToken(refreshToken);

    const familyKey = `${REFRESH_TOKEN_FAMILY_PREFIX}${payload.sub}`;
    const jti = typeof payload.jti === "string" ? payload.jti : null;

    // Reuse detection: if we've already rotated with a different token id,
    // the refresh token was presented twice (theft/replay).
    const storedJti = jti ? await redis.get(familyKey) : null;
    if (storedJti !== null && storedJti !== jti) {
      await redis.del(familyKey);
      return apiUnauthorized("Refresh token reused — revoked");
    }

    const newAccessToken = await signAccessToken(
      payload.sub,
      payload.role,
      payload.phone
    );
    const newRefreshToken = await signRefreshToken(
      payload.sub,
      payload.role,
      payload.phone
    );

    const newPayload = await verifyRefreshToken(newRefreshToken);
    const newJti =
      typeof newPayload.jti === "string" ? newPayload.jti : jti ?? "active";
    await redis.set(familyKey, newJti, {
      ex: getRefreshExpiry(),
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Token refreshed",
        data: {},
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

    setAuthCookies(
      response,
      newAccessToken,
      newRefreshToken,
      getAccessExpiry(),
      getRefreshExpiry()
    );

    return response;
  } catch (error) {
    console.error("Refresh token error:", error instanceof Error ? error.message : "unknown");
    return apiUnauthorized("Invalid or expired refresh token");
  }
}
