import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hmacSign,
  hmacVerify,
  generateInviteCode,
} from "@/lib/utils/crypto";

const CODE = "00000000-0000-0000-0000-00000000000a";
const IDX = "00000000-0000-0000-0000-000000000001";
const GAME = "00000000-0000-0000-0000-000000000001";
const TS = "2026-09-01T10:00:00.000Z";

test("hmacSign is deterministic for identical inputs", () => {
  assert.equal(
    hmacSign(CODE, IDX, GAME, TS),
    hmacSign(CODE, IDX, GAME, TS)
  );
});

test("hmacSign changes when any input field changes", () => {
  const base = hmacSign(CODE, IDX, GAME, TS);
  assert.notEqual(hmacSign("other-code", IDX, GAME, TS), base);
  assert.notEqual(hmacSign(CODE, "other-id", GAME, TS), base);
  assert.notEqual(hmacSign(CODE, IDX, "other-game", TS), base);
  assert.notEqual(hmacSign(CODE, IDX, GAME, TS + "1"), base);
});

test("hmacVerify accepts a genuine signature", () => {
  const sig = hmacSign(CODE, IDX, GAME, TS);
  assert.equal(hmacVerify(sig, CODE, IDX, GAME, TS), true);
});

test("hmacVerify rejects tampered or mis-scoped signatures", () => {
  const sig = hmacSign(CODE, IDX, GAME, TS);
  assert.equal(hmacVerify(sig, "other-code", IDX, GAME, TS), false);
  assert.equal(hmacVerify(sig, CODE, "other-id", GAME, TS), false);
  assert.equal(hmacVerify(sig, CODE, IDX, "other-game", TS), false);
  assert.equal(hmacVerify(sig, CODE, IDX, GAME, "2026-09-01T11:00:00.000Z"), false);
  assert.equal(hmacVerify("deadbeef", CODE, IDX, GAME, TS), false);
  assert.equal(hmacVerify("", CODE, IDX, GAME, TS), false);
});

test("hmacVerify rejects non-hex garbage safely (no throw)", () => {
  assert.doesNotThrow(() => hmacVerify("zzzz", CODE, IDX, GAME, TS));
  assert.equal(hmacVerify("zzzz", CODE, IDX, GAME, TS), false);
});

test("generateInviteCode yields 6 chars from the unambiguous alphabet", () => {
  const allowed = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split(""));
  for (let i = 0; i < 500; i++) {
    const code = generateInviteCode();
    assert.equal(code.length, 6);
    for (const ch of code) {
      assert.equal(allowed.has(ch), true, `unexpected char ${ch}`);
    }
  }
});

test("generateInviteCode produces distinct codes in bulk", () => {
  const codes = new Set<string>();
  for (let i = 0; i < 2000; i++) codes.add(generateInviteCode());
  assert.equal(codes.size, 2000);
});