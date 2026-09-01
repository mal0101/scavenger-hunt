import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hmacSign,
  hmacVerify,
  generateInviteCode,
} from "@/lib/utils/crypto";

const IDX = "00000000-0000-0000-0000-000000000001";
const GAME = "00000000-0000-0000-0000-000000000001";
const ROUND = "00000000-0000-0000-0000-000000000002";
const TS = "2026-09-01T10:00:00.000Z";

test("hmacSign is deterministic for identical inputs", () => {
  assert.equal(hmacSign(IDX, GAME, ROUND, TS), hmacSign(IDX, GAME, ROUND, TS));
});

test("hmacSign changes when any input field changes", () => {
  const base = hmacSign(IDX, GAME, ROUND, TS);
  assert.notEqual(hmacSign("other-id", GAME, ROUND, TS), base);
  assert.notEqual(hmacSign(IDX, "other-game", ROUND, TS), base);
  assert.notEqual(hmacSign(IDX, GAME, "other-round", TS), base);
  assert.notEqual(hmacSign(IDX, GAME, ROUND, TS + "1"), base);
});

test("hmacVerify accepts a genuine signature", () => {
  const sig = hmacSign(IDX, GAME, ROUND, TS);
  assert.equal(hmacVerify(sig, IDX, GAME, ROUND, TS), true);
});

test("hmacVerify rejects tampered or mis-scoped signatures", () => {
  const sig = hmacSign(IDX, GAME, ROUND, TS);
  assert.equal(hmacVerify(sig, "other-id", GAME, ROUND, TS), false);
  assert.equal(hmacVerify(sig, IDX, "other-game", ROUND, TS), false);
  assert.equal(hmacVerify(sig, IDX, GAME, "other-round", TS), false);
  assert.equal(hmacVerify(sig, IDX, GAME, ROUND, "2026-09-01T11:00:00.000Z"), false);
  assert.equal(hmacVerify("deadbeef", IDX, GAME, ROUND, TS), false);
  assert.equal(hmacVerify("", IDX, GAME, ROUND, TS), false);
});

test("hmacVerify rejects non-hex garbage safely (no throw)", () => {
  assert.doesNotThrow(() => hmacVerify("zzzz", IDX, GAME, ROUND, TS));
  assert.equal(hmacVerify("zzzz", IDX, GAME, ROUND, TS), false);
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