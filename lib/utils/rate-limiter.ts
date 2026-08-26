import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/db/redis";

const isDev = process.env.NODE_ENV === "development";

export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: !isDev,
  prefix: "ratelimit:general",
});

export const otpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: !isDev,
  prefix: "ratelimit:otp",
});

export const otpVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  analytics: !isDev,
  prefix: "ratelimit:otp-verify",
});

export const scanLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: !isDev,
  prefix: "ratelimit:scan",
});

export const refreshLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: !isDev,
  prefix: "ratelimit:refresh",
});

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    return { success: true, remaining: 999, reset: Date.now() + 60000 };
  }
}
