import QRCode from "qrcode";
import { hmacSign } from "@/lib/utils/crypto";

export interface QrPayload {
  index_id: string;
  game_id: string;
  round_id: string;
  timestamp: string;
  signature: string;
}

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function bytesToUuid(buf: Buffer): string {
  const hex = buf.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20)}`;
}

export function createQrPayload(
  indexId: string,
  gameId: string,
  roundId: string
): QrPayload {
  // Use second-precision timestamp so encode (4-byte) and sign are consistent.
  const timestamp = String(Math.floor(Date.now() / 1000) * 1000);
  const signature = hmacSign(indexId, gameId, roundId, timestamp);

  return {
    index_id: indexId,
    game_id: gameId,
    round_id: roundId,
    timestamp,
    signature,
  };
}

// Binary layout (fixed 68 bytes):
//   indexId  : 16 bytes
//   gameId   : 16 bytes
//   roundId  : 16 bytes
//   timestamp:  4 bytes (unix seconds, big-endian)
//   signature: 16 bytes (128-bit HMAC, as 32 hex chars)
export function encodeQrPayload(payload: QrPayload): string {
  const buf = Buffer.alloc(68);

  uuidToBytes(payload.index_id).copy(buf, 0);
  uuidToBytes(payload.game_id).copy(buf, 16);
  uuidToBytes(payload.round_id).copy(buf, 32);

  const ts = Math.floor(Number(payload.timestamp) / 1000);
  buf.writeUInt32BE(ts >>> 0, 48);

  Buffer.from(payload.signature, "hex").copy(buf, 52);

  return buf.toString("base64url");
}

export function decodeQrPayload(encoded: string): QrPayload | null {
  try {
    const buf = Buffer.from(encoded, "base64url");

    // New binary format (68 bytes)
    if (buf.length === 68) {
      const tsSec = buf.readUInt32BE(48);
      const signature = buf.subarray(52, 68).toString("hex");
      return {
        index_id: bytesToUuid(buf.subarray(0, 16)),
        game_id: bytesToUuid(buf.subarray(16, 32)),
        round_id: bytesToUuid(buf.subarray(32, 48)),
        timestamp: String(tsSec * 1000),
        signature,
      };
    }

    // Legacy: compact JSON array or object encoding
    const decoded = Buffer.from(encoded, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed) && parsed.length === 5) {
      const [index_id, game_id, round_id, timestamp, signature] = parsed;
      return { index_id, game_id, round_id, timestamp, signature };
    }
    return parsed as QrPayload;
  } catch {
    return null;
  }
}

export async function generateQrImage(
  indexId: string,
  gameId: string,
  roundId: string
): Promise<string> {
  const payload = createQrPayload(indexId, gameId, roundId);
  const encoded = encodeQrPayload(payload);
  return QRCode.toDataURL(encoded, {
    errorCorrectionLevel: "L",
    margin: 2,
    width: 300,
    color: {
      dark: "#1c110c",
      light: "#ffffff",
    },
  });
}

export async function generateQrSvg(
  indexId: string,
  gameId: string,
  roundId: string
): Promise<string> {
  const payload = createQrPayload(indexId, gameId, roundId);
  const encoded = encodeQrPayload(payload);
  return QRCode.toString(encoded, {
    type: "svg",
    errorCorrectionLevel: "L",
    margin: 2,
    color: {
      dark: "#1c110c",
      light: "#ffffff",
    },
  });
}
