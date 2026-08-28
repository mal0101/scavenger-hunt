import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db/postgres";
import { apiError, apiInternal } from "@/lib/types/api";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const user = await db.user.findUnique({
      where: { id: auth.sub },
      select: { id: true, phone_number: true, role: true, nickname: true },
    });

    if (!user) return apiError("User not found", "NOT_FOUND", 404);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone_number,
          role: user.role,
          nickname: user.nickname,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Me error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to load session");
  }
}
