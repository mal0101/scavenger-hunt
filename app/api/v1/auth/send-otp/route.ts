import { NextRequest } from "next/server";
import { generateOtp } from "@/lib/auth/otp";
import { phoneSchema } from "@/lib/utils/validation";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { checkRateLimit, otpLimiter } from "@/lib/utils/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = phoneSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid phone number format", "VALIDATION_ERROR");
    }

    const { phone_number } = parsed.data;

    const rateLimitResult = await checkRateLimit(otpLimiter, phone_number);
    if (!rateLimitResult.success) {
      return apiError(
        "Too many OTP requests. Please wait before requesting again.",
        "RATE_LIMITED",
        429
      );
    }

    const recentOtp = await db.oTP.findFirst({
      where: {
        phone_number,
        created_at: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentOtp) {
      return apiError(
        "Please wait 60 seconds before requesting a new code",
        "OTP_COOLDOWN"
      );
    }

    const code = await generateOtp(phone_number);

    if (process.env.OTP_MOCK === "true") {
      console.log(`[MOCK] OTP for ${phone_number.slice(0, 4)}****: ${code}`);
    }

    return apiSuccess(
      { message: "OTP sent successfully" },
      "OTP dispatched"
    );
  } catch (error) {
    console.error("Send OTP error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to send OTP");
  }
}
