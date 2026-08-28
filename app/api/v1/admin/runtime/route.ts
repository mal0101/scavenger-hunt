import { NextRequest, NextResponse } from "next/server";
import { requireMentor } from "@/lib/auth/guard";
import { GAME_CONSTANTS } from "@/lib/utils/constants";
import { apiInternal } from "@/lib/types/api";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? "";
    const redisConfigured = redisUrl.startsWith("https://");

    const otpMockRaw = process.env.OTP_MOCK ?? "";
    const otpMock = otpMockRaw === "true" || otpMockRaw === "1";

    return NextResponse.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV ?? "development",
        database: {
          provider: "postgres",
          configured: Boolean(process.env.DATABASE_URL),
        },
        redis: {
          mode: redisConfigured ? "upstash" : "local-mock",
          configured: redisConfigured,
        },
        otp: {
          mock: otpMock,
          expiry_seconds: GAME_CONSTANTS.OTP_EXPIRY_SECONDS,
          rate_limit_seconds: GAME_CONSTANTS.OTP_RATE_LIMIT_SECONDS,
        },
        auth: {
          access_expiry_seconds: GAME_CONSTANTS.ACCESS_TOKEN_EXPIRY,
          refresh_expiry_seconds: GAME_CONSTANTS.REFRESH_TOKEN_EXPIRY,
        },
        game: {
          max_rounds: GAME_CONSTANTS.DEFAULT_MAX_ROUNDS,
          round_duration: GAME_CONSTANTS.DEFAULT_ROUND_DURATION,
          elimination_pct: GAME_CONSTANTS.DEFAULT_ELIMINATION_PCT,
          max_scans_per_minute: GAME_CONSTANTS.MAX_SCANS_PER_MINUTE,
        },
        mentor: {
          id: auth.sub,
          phone: auth.phone,
        },
        sse: {
          heartbeat_interval: GAME_CONSTANTS.SSE_HEARTBEAT_INTERVAL,
          timer_sync_interval: GAME_CONSTANTS.TIMER_SYNC_INTERVAL,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Runtime error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to load runtime config");
  }
}
