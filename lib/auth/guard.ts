import { type NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { apiUnauthorized, apiForbidden } from "@/lib/types/api";

export interface AuthPayload {
  sub: string;
  role: "PLAYER" | "MENTOR";
  phone: string;
}

export async function requireAuth(
  request: NextRequest
): Promise<AuthPayload | Response> {
  const token =
    request.cookies.get("access_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return apiUnauthorized("No authentication token provided");
  }

  try {
    const payload = await verifyAccessToken(token);
    return {
      sub: payload.sub,
      role: payload.role as "PLAYER" | "MENTOR",
      phone: payload.phone,
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
  return auth;
}
