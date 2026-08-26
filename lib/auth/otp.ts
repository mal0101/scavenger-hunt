import crypto from "crypto";
import { db } from "@/lib/db/postgres";

const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS ?? "300", 10);
const MAX_OTP_ATTEMPTS = 5;

export async function generateOtp(phoneNumber: string): Promise<string> {
  if (process.env.OTP_MOCK === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_MOCK cannot be enabled in production");
    }
    return "000000";
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));

  await db.oTP.create({
    data: {
      phone_number: phoneNumber,
      code,
      expires_at: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
    },
  });

  return code;
}

export async function verifyOtp(
  phoneNumber: string,
  code: string
): Promise<boolean> {
  if (process.env.OTP_MOCK === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_MOCK cannot be enabled in production");
    }
    return code === "000000";
  }

  const otp = await db.oTP.findFirst({
    where: {
      phone_number: phoneNumber,
      used: false,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
  });

  if (!otp) return false;

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await db.oTP.update({
      where: { id: otp.id },
      data: { used: true },
    });
    return false;
  }

  await db.oTP.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } },
  });

  const codeBuffer = Buffer.from(otp.code);
  const inputBuffer = Buffer.from(code);

  if (codeBuffer.length !== inputBuffer.length) return false;

  return crypto.timingSafeEqual(codeBuffer, inputBuffer);
}

export async function invalidateOtp(phoneNumber: string): Promise<void> {
  await db.oTP.updateMany({
    where: { phone_number: phoneNumber, used: false },
    data: { used: true },
  });
}
