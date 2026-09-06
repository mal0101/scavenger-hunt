import crypto from "crypto";

function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("HMAC_SECRET environment variable is required in production");
    }
    return "dev_hmac_secret_change_in_production";
  }
  return secret;
}

export function hmacSign(
  codeId: string,
  indexId: string,
  gameId: string,
  timestamp: string
): string {
  const payload = `${codeId}:${indexId}:${gameId}:${timestamp}`;
  return crypto.createHmac("sha256", getHmacSecret()).update(payload).digest("hex");
}

export function hmacVerify(
  signature: string,
  codeId: string,
  indexId: string,
  gameId: string,
  timestamp: string
): boolean {
  const expected = hmacSign(codeId, indexId, gameId, timestamp);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}
