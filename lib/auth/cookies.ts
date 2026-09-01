import { type NextRequest, NextResponse } from "next/server";

export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get("refresh_token")?.value ?? null;
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  accessMaxAge: number,
  refreshMaxAge: number
): NextResponse {
  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: accessMaxAge,
    path: "/",
  });

  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: refreshMaxAge,
    path: "/",
  });

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}
