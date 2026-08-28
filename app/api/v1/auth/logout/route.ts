import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Signed out",
    timestamp: new Date().toISOString(),
  });
  clearAuthCookies(response);
  return response;
}
