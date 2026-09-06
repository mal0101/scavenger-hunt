import QRCode from "qrcode";
import { hmacSign } from "@/lib/utils/crypto";

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
  codeId: string
): QrPayload {
  const timestamp = new Date().toISOString();
  const signature = hmacSign(codeId, indexId, gameId, roundId, timestamp);

  return {
    code_id: codeId,
    index_id: indexId,
    game_id: gameId,
    round_id: roundId,
    timestamp,
    signature,
  };
}

export function encodeQrPayload(payload: QrPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeQrPayload(encoded: string): QrPayload | null {
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf-8");
    return JSON.parse(decoded) as QrPayload;
  } catch {
    return null;
  }
}

export async function generateQrImage(
  indexId: string,
  gameId: string,
  roundId: string,
  codeId: string
): Promise<string> {
  const payload = createQrPayload(indexId, gameId, roundId, codeId);
  const encoded = encodeQrPayload(payload);
  return QRCode.toDataURL(encoded, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: {
      dark: "#1c110c",
      light: "#f5ded5",
    },
  });
}

export async function generateQrSvg(
  indexId: string,
  gameId: string,
  roundId: string,
  codeId: string
): Promise<string> {
  const payload = createQrPayload(indexId, gameId, roundId, codeId);
  const encoded = encodeQrPayload(payload);
  return QRCode.toString(encoded, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#1c110c",
      light: "#f5ded5",
    },
  });
}
