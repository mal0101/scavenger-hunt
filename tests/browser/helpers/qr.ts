import crypto from "crypto";
import QRCode from "qrcode";
import { loadEnvLocal } from "./env";

loadEnvLocal();

// Mirrors lib/utils/crypto.ts (server-side secret) so tests can sign QR
// payloads the validator will accept. The secret is loaded from .env.local,
// which Next already loads for the running app.
function getHmacSecret(): string {
  return process.env.HMAC_SECRET ?? "dev_hmac_secret_change_in_production";
}

export function hmacSign(
  codeId: string,
  indexId: string,
  gameId: string,
  roundId: string,
  timestamp: string
): string {
  const payload = `${codeId}:${indexId}:${gameId}:${roundId}:${timestamp}`;
  return crypto.createHmac("sha256", getHmacSecret()).update(payload).digest("hex");
}

// Mirrors lib/qr/generator.ts createQrPayload + encodeQrPayload.
export interface QrPayload {
  code_id: string;
  index_id: string;
  game_id: string;
  round_id: string;
  timestamp: string;
  signature: string;
}

export function createQrPayload(
  indexId: string,
  gameId: string,
  roundId: string,
  codeId: string,
  timestamp = new Date().toISOString()
): QrPayload {
  const signature = hmacSign(codeId, indexId, gameId, roundId, timestamp);
  return { code_id: codeId, index_id: indexId, game_id: gameId, round_id: roundId, timestamp, signature };
}

export function encodeQrPayload(payload: QrPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export async function qrDataUrl(encoded: string): Promise<string> {
  return QRCode.toDataURL(encoded, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480,
    color: { dark: "#1c110c", light: "#ffffff" },
  });
}