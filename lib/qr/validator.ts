import { decodeQrPayload, type QrPayload } from "@/lib/qr/generator";
import { hmacVerify } from "@/lib/utils/crypto";

export interface ValidationResult {
  valid: boolean;
  payload?: QrPayload;
  error?: string;
}

export function validateQrCode(
  encodedData: string,
  expectedGameId: string
): ValidationResult {
  const payload = decodeQrPayload(encodedData);

  if (!payload) {
    return { valid: false, error: "QR_DECODE_FAILED" };
  }

  const signatureValid = hmacVerify(
    payload.signature,
    payload.code_id,
    payload.index_id,
    payload.game_id,
    payload.timestamp
  );

  if (!signatureValid) {
    return { valid: false, error: "QR_SIGNATURE_INVALID" };
  }

  if (!payload.code_id) {
    return { valid: false, error: "QR_SIGNATURE_INVALID" };
  }

  if (payload.game_id !== expectedGameId) {
    return { valid: false, error: "QR_GAME_MISMATCH" };
  }

  const timestamp = Number(payload.timestamp);
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours > 24) {
    return { valid: false, error: "QR_EXPIRED" };
  }

  if (diffMs < 0) {
    return { valid: false, error: "QR_FUTURE_TIMESTAMP" };
  }

  return { valid: true, payload };
}
