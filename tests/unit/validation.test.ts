import { test } from "node:test";
import assert from "node:assert/strict";
import {
  phoneSchema,
  otpSchema,
  teamSchema,
  gameSchema,
  indexSchema,
  scanSchema,
  stateTransitionSchema,
} from "@/lib/utils/validation";

test("phoneSchema accepts 10-15 digits with optional +", () => {
  const ok = ["+212600000001", "0612345678", "14155551234"];
  for (const p of ok) {
    assert.equal(phoneSchema.safeParse({ phone_number: p }).success, true, p);
  }
});

test("phoneSchema rejects letters, symbols and wrong lengths", () => {
  const bad = ["abc", "123", "123456789", "12-345", "a+123456789", "1234567890123456"];
  for (const p of bad) {
    assert.equal(phoneSchema.safeParse({ phone_number: p }).success, false, p);
  }
});

test("otpSchema requires exactly 6 digits", () => {
  assert.equal(otpSchema.safeParse({ phone_number: "x", code: "123456" }).success, true);
  for (const code of ["12345", "1234567", "abcdef", "12 456", ""]) {
    assert.equal(otpSchema.safeParse({ phone_number: "x", code }).success, false, code);
  }
});

test("teamSchema requires a name and optionally a 6-char invite code", () => {
  assert.equal(teamSchema.safeParse({ team_name: "Steam Rats" }).success, true);
  assert.equal(
    teamSchema.safeParse({ team_name: "Steam Rats", invite_code: "ABC123" }).success,
    true
  );
  assert.equal(teamSchema.safeParse({ team_name: "" }).success, false);
  assert.equal(teamSchema.safeParse({ team_name: "x".repeat(51) }).success, false);
  assert.equal(
    teamSchema.safeParse({ team_name: "Steam Rats", invite_code: "SHORT" }).success,
    false
  );
});

test("gameSchema applies defaults and clamps bounds", () => {
  const parsed = gameSchema.safeParse({ title: "QA Game" });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.max_rounds, 3);
  assert.equal(parsed.data.round_duration, 1800);
  assert.equal(parsed.data.elimination_pct, 0.2);

  assert.equal(gameSchema.safeParse({ title: "X", max_rounds: 0 }).success, false);
  assert.equal(gameSchema.safeParse({ title: "X", max_rounds: 11 }).success, false);
  assert.equal(gameSchema.safeParse({ title: "X", round_duration: 60 }).success, false);
  assert.equal(gameSchema.safeParse({ title: "X", round_duration: 7201 }).success, false);
  assert.equal(gameSchema.safeParse({ title: "X", elimination_pct: 0.6 }).success, false);
  assert.equal(gameSchema.safeParse({ title: "" }).success, false);
});

test("indexSchema requires a uuid game_id and clamps points", () => {
  const base = {
    game_id: "00000000-0000-0000-0000-000000000001",
    label: "Boiler",
  };
  assert.equal(indexSchema.safeParse(base).success, true);
  assert.equal(
    indexSchema.safeParse({ ...base, points: 0 }).success,
    false,
    "points below minimum"
  );
  assert.equal(
    indexSchema.safeParse({ ...base, points: 101 }).success,
    false,
    "points above maximum"
  );
  assert.equal(indexSchema.safeParse({ ...base, game_id: "not-a-uuid" }).success, false);
  assert.equal(indexSchema.safeParse({ ...base, label: "" }).success, false);
});

test("scanSchema requires qr_data and a uuid game_id; coords optional", () => {
  assert.equal(
    scanSchema.safeParse({
      qr_data: "abc",
      game_id: "00000000-0000-0000-0000-000000000001",
    }).success,
    true
  );
  assert.equal(scanSchema.safeParse({ qr_data: "" }).success, false);
  assert.equal(scanSchema.safeParse({ qr_data: "abc" }).success, false);
  assert.equal(
    scanSchema.safeParse({
      qr_data: "abc",
      game_id: "nope",
      gps_lat: 91,
    }).success,
    false
  );
});

test("stateTransitionSchema accepts only the five engine actions", () => {
  for (const action of ["start", "eliminate", "next_round", "finish", "reset"]) {
    assert.equal(stateTransitionSchema.safeParse({ action }).success, true, action);
  }
  for (const action of ["pause", "STOP", "begin", ""]) {
    assert.equal(stateTransitionSchema.safeParse({ action }).success, false, action);
  }
});