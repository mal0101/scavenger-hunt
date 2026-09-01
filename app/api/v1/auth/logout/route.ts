import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getRefreshTokenFromRequest } from "@/lib/auth/cookies";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { redis } from "@/lib/db/redis";

export async function POST(request: NextRequest) {
  const refreshToken = getRefreshTokenFromRequest(request);

  if (refreshToken) {
    try {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload?.jti && payload?.sub) {
        await redis.del(`refresh_token:${payload.sub}`);
      }
    } catch {
      // Token may already be invalid; proceed with cookie cleanup
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Signed out",
    timestamp: new Date().toISOString(),
  });
  clearAuthCookies(response);
  return response;
}
