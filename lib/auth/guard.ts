import { type NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { apiUnauthorized, apiForbidden, apiError } from "@/lib/types/api";
import { checkRateLimit, generalLimiter } from "@/lib/utils/rate-limiter";

export interface AuthPayload {
  sub: string;
  role: "PLAYER" | "MENTOR";
  username: string;
}

export async function requireAuth(
  request: NextRequest
): Promise<AuthPayload | Response> {
  const token =
    request.cookies.get("access_token")?.value ??
    request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return apiUnauthorized("No authentication token provided");
  }

  try {
    const payload = await verifyAccessToken(token);
    return {
      sub: payload.sub,
      role: payload.role as "PLAYER" | "MENTOR",
      username: payload.username,
    };
  } catch {
    return apiUnauthorized("Invalid or expired token");
  }
}

export async function requirePlayer(
  request: NextRequest
): Promise<AuthPayload | Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== "PLAYER") return apiForbidden("Player access required");
  return auth;
}

export async function requireMentor(
  request: NextRequest
): Promise<AuthPayload | Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== "MENTOR") return apiForbidden("Mentor access required");

  // All admin endpoints share one general limiter; in dev/CI (LocalRedisMock
  // or unprovisioned Upstash) the check is a pass-through, so this only
  // throttles real deployments.
  const rateLimitResult = await checkRateLimit(generalLimiter, auth.sub);
  if (!rateLimitResult.success) {
    return apiError("Too many requests. Please wait.", "RATE_LIMITED", 429);
  }

  return auth;
}
