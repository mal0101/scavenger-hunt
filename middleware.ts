import { type NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const PUBLIC_ROUTES = ["/login", "/verify", "/role-select"];
const AUTH_ROUTES = ["/login", "/verify", "/role-select", "/"];
const PLAYER_PREFIXES = [
  "/dock",
  "/scan",
  "/scan-result",
  "/leaderboard",
  "/vault",
  "/logs",
  "/enigma",
  "/trap",
];
const MENTOR_PREFIXES = ["/mentor"];
const PUBLIC_API_PREFIXES = ["/api/v1/auth/"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname === route + "/"
  );
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname === route + "/"
  );
}

function isPlayerRoute(pathname: string): boolean {
  return PLAYER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isMentorRoute(pathname: string): boolean {
  return MENTOR_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/v1/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const accessToken =
    request.cookies.get("access_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  // Public API routes (auth endpoints) bypass JWT check
  if (isApiRoute(pathname) && isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  // API routes that require authentication
  if (isApiRoute(pathname)) {
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Authentication required", error: "UNAUTHORIZED", timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    try {
      const payload = await verifyAccessToken(accessToken);

      // Admin routes require MENTOR role
      if (isAdminApiRoute(pathname) && payload.role !== "MENTOR") {
        return NextResponse.json(
          { success: false, message: "Mentor access required", error: "FORBIDDEN", timestamp: new Date().toISOString() },
          { status: 403 }
        );
      }

      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.sub);
      response.headers.set("x-user-role", payload.role);
      response.headers.set("x-user-phone", payload.phone);
      return response;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token", error: "UNAUTHORIZED", timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
  }

  // Page routes: unauthenticated users go to login
  if (!accessToken) {
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifyAccessToken(accessToken);

    if (isAuthRoute(pathname)) {
      const redirectPath =
        payload.role === "MENTOR" ? "/mentor/dashboard" : "/dock";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    if (payload.role === "PLAYER" && isMentorRoute(pathname)) {
      return NextResponse.redirect(new URL("/dock", request.url));
    }

    if (payload.role === "MENTOR" && isPlayerRoute(pathname)) {
      return NextResponse.redirect(
        new URL("/mentor/dashboard", request.url)
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    response.headers.set("x-user-phone", payload.phone);
    return response;
  } catch {
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/|manifest.json|sw.js).*)",
  ],
};
