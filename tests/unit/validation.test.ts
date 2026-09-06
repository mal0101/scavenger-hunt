import { test } from "node:test";
import assert from "node:assert/strict";
import {
  credentialsSchema,
  createUserSchema,
  resetPasswordSchema,
  teamSchema,
  gameSchema,
  indexSchema,
  scanSchema,
  stateTransitionSchema,
} from "@/lib/utils/validation";

test("credentialsSchema accepts valid username/password pairs", () => {
  const ok = [
    { username: "captain_a", password: "longenough" },
    { username: "bert", password: "12345678" },
    { username: "a.b-1_2", password: "x".repeat(128) },
  ];
  for (const c of ok) {
    assert.equal(credentialsSchema.safeParse(c).success, true, JSON.stringify(c));
  }
});

test("credentialsSchema rejects short usernames, bad chars and weak passwords", () => {
  const bad = [
    { username: "ab", password: "longenough" },
    { username: "a b", password: "longenough" },
    { username: "héllo", password: "longenough" },
    { username: "x".repeat(33), password: "longenough" },
    { username: "valid_name", password: "short" },
    { username: "valid_name", password: "x".repeat(129) },
  ];
  for (const c of bad) {
    assert.equal(credentialsSchema.safeParse(c).success, false, JSON.stringify(c));
  }
});

test("createUserSchema defaults role to PLAYER and allows optional nickname/game_id", () => {
  const parsed = createUserSchema.safeParse({ username: "rookie", password: "12345678" });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.role, "PLAYER");

  assert.equal(
    createUserSchema.safeParse({
      username: "mentor2",
      password: "12345678",
      role: "MENTOR",
      nickname: "Ops",
    }).success,
    true
  );
  assert.equal(
    createUserSchema.safeParse({
      username: "rookie",
      password: "12345678",
      role: "ADMIN",
    }).success,
    false
  );
});

test("resetPasswordSchema requires a strong password", () => {
  assert.equal(resetPasswordSchema.safeParse({ password: "12345678" }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ password: "short" }).success, false);
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