import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiNotFound, apiInternal } from "@/lib/types/api";
import { resetPasswordSchema } from "@/lib/utils/validation";
import { hashPassword } from "@/lib/auth/passwords";
import { requireMentor } from "@/lib/auth/guard";
import { redis } from "@/lib/db/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return apiNotFound("User not found");

    const body = await request.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid password", "VALIDATION_ERROR");
    }

    await db.user.update({
      where: { id },
      data: { password_hash: await hashPassword(parsed.data.password) },
    });

    try {
      await redis.del(`refresh_token:${id}`);
    } catch {
      // best-effort: invalidating refresh families should not fail the reset
    }

    return apiSuccess(
      { id },
      "Password reset — the user's sessions have been revoked"
    );
  } catch (error) {
    console.error("Reset password error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to reset password");
  }
}