import { test } from "node:test";
import assert from "node:assert/strict";
import { hmacSign } from "@/lib/utils/crypto";
import {
  createQrPayload,
  encodeQrPayload,
  decodeQrPayload,
} from "@/lib/qr/generator";
import { validateQrCode } from "@/lib/qr/validator";

const CODE = "00000000-0000-0000-0000-00000000000a";
const IDX = "00000000-0000-0000-0000-000000000001";
const GAME = "00000000-0000-0000-0000-000000000001";
const ROUND = "00000000-0000-0000-0000-000000000002";

const HOUR = 60 * 60 * 1000;

function buildPayload(
  overrides: { codeId?: string; indexId?: string; gameId?: string; roundId?: string; timestamp?: string } = {}
) {
  const timestamp = overrides.timestamp ?? new Date().toISOString();
  const codeId = overrides.codeId ?? CODE;
  const indexId = overrides.indexId ?? IDX;
  const gameId = overrides.gameId ?? GAME;
  const roundId = overrides.roundId ?? ROUND;
  return {
    code_id: codeId,
    index_id: indexId,
    game_id: gameId,
    round_id: roundId,
    timestamp,
    signature: hmacSign(codeId, indexId, gameId, roundId, timestamp),
  };
}

test("createQrPayload produces a signed payload", () => {
  const payload = createQrPayload(IDX, GAME, ROUND, CODE);
  assert.equal(payload.code_id, CODE);
  assert.equal(payload.index_id, IDX);
  assert.equal(payload.game_id, GAME);
  assert.equal(payload.round_id, ROUND);
  assert.equal(typeof payload.signature, "string");
  assert.equal(payload.signature.length, 64);
});

test("encode/decode round-trips the payload", () => {
  const payload = createQrPayload(IDX, GAME, ROUND, CODE);
  const decoded = decodeQrPayload(encodeQrPayload(payload));
  assert.deepEqual(decoded, payload);
});

test("decodeQrPayload returns null for garbage", () => {
  assert.equal(decodeQrPayload(""), null);
  assert.equal(decodeQrPayload("!!__not_b64__!!"), null);
  assert.equal(
    decodeQrPayload(Buffer.from("not json {", "utf-8").toString("base64url")),
    null
  );
});

test("validateQrCode accepts a valid freshly-signed code", () => {
  const result = validateQrCode(encodeQrPayload(createQrPayload(IDX, GAME, ROUND, CODE)), GAME);
  assert.equal(result.valid, true);
  assert.equal(result.payload?.index_id, IDX);
  assert.equal(result.payload?.code_id, CODE);
});

test("validateQrCode rejects a tampered signature", () => {
  const payload = buildPayload();
  payload.signature = payload.signature.slice(0, -1) + (payload.signature.endsWith("a") ? "b" : "a");
  const result = validateQrCode(encodeQrPayload(payload), GAME);
  assert.equal(result.valid, false);
  assert.equal(result.error, "QR_SIGNATURE_INVALID");
});

test("validateQrCode rejects a payload whose code_id was swapped after signing", () => {
  const payload = buildPayload();
  payload.code_id = "11111111-1111-1111-1111-111111111111";
  const result = validateQrCode(encodeQrPayload(payload), GAME);
  assert.equal(result.valid, false);
  assert.equal(result.error, "QR_SIGNATURE_INVALID");
});

test("validateQrCode rejects a wrong-scope game", () => {
  const code = encodeQrPayload(buildPayload({ gameId: "11111111-1111-1111-1111-111111111111" }));
  const result = validateQrCode(code, GAME);
  assert.equal(result.valid, false);
  assert.equal(result.error, "QR_GAME_MISMATCH");
});

test("validateQrCode rejects timestamps older than 24h", () => {
  const old = new Date(Date.now() - 25 * HOUR).toISOString();
  const result = validateQrCode(encodeQrPayload(buildPayload({ timestamp: old })), GAME);
  assert.equal(result.valid, false);
  assert.equal(result.error, "QR_EXPIRED");
});

test("validateQrCode accepts timestamps within 24h but rejects future ones", () => {
  const recent = new Date(Date.now() - HOUR).toISOString();
  assert.equal(validateQrCode(encodeQrPayload(buildPayload({ timestamp: recent })), GAME).valid, true);

  const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const result = validateQrCode(encodeQrPayload(buildPayload({ timestamp: future })), GAME);
  assert.equal(result.valid, false);
  assert.equal(result.error, "QR_FUTURE_TIMESTAMP");
});

test("validateQrCode rejects undecodable input", () => {
  const result = validateQrCode("$$$not-qr$$$", GAME);
  assert.equal(result.valid, false);
  assert.equal(result.error, "QR_DECODE_FAILED");
});