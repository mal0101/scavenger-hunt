import crypto from "crypto";

const HMAC_SECRET = process.env.HMAC_SECRET || "dev_hmac_secret_change_in_production";

export function hmacSign(
  indexId: string,
  gameId: string,
  roundId: string,
  timestamp: string
): string {
  const payload = `${indexId}:${gameId}:${roundId}:${timestamp}`;
  return crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("hex");
}

export function hmacVerify(
  signature: string,
  indexId: string,
  gameId: string,
  roundId: string,
  timestamp: string
): boolean {
  const expected = hmacSign(indexId, gameId, roundId, timestamp);
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
