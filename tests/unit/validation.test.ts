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
  validateIndexEnigma,
  parseAnswerOptions,
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

test("indexSchema accepts hint, sequence_order, and answer_options with bounds", () => {
  const trap = {
    game_id: "00000000-0000-0000-0000-000000000001",
    label: "Gauge",
    enigma_type: "trap",
    question: "What moves steam?",
    answer: "steam",
    hint: "Follow the pipes",
    sequence_order: 5,
    answer_options: ["steam", "coal", "water"],
  };
  assert.equal(indexSchema.safeParse(trap).success, true);

  assert.equal(
    indexSchema.safeParse({ ...trap, hint: "x".repeat(501) }).success,
    false,
    "hint longer than 500 chars"
  );
  assert.equal(indexSchema.safeParse({ ...trap, sequence_order: -1 }).success, false, "negative sequence");
  assert.equal(indexSchema.safeParse({ ...trap, sequence_order: 501 }).success, false, "sequence above max");
  assert.equal(indexSchema.safeParse({ ...trap, answer_options: [] }).success, false, "empty options");
  assert.equal(
    indexSchema.safeParse({ ...trap, answer_options: ["x".repeat(201)] }).success,
    false,
    "option longer than 200 chars"
  );
  assert.equal(
    indexSchema.safeParse({ ...trap, answer_options: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] }).success,
    false,
    "more than 8 options"
  );
  assert.equal(indexSchema.safeParse({ ...trap, sequence_order: 0, hint: undefined, answer_options: undefined }).success, true);
});

test("validateIndexEnigma enforces trap question/answer and QCM answer membership", () => {
  // Safe indexes need nothing extra regardless of stray question/answer fields.
  assert.equal(validateIndexEnigma({ enigma_type: "visual", question: "x", answer: "y" }), null);

  assert.equal(
    validateIndexEnigma({ enigma_type: "trap", question: " ", answer: "a" }),
    "Trap indexes require a question"
  );
  assert.equal(
    validateIndexEnigma({ enigma_type: "trap", question: "Q", answer: "  " }),
    "Trap indexes require a correct answer"
  );
  assert.equal(validateIndexEnigma({ enigma_type: "trap", question: "Q", answer: "a" }), null);

  assert.equal(
    validateIndexEnigma({ enigma_type: "trap", question: "Q", answer: "a", answer_options: ["a"] }),
    "QCM traps require at least two answer options"
  );
  assert.equal(
    validateIndexEnigma({ enigma_type: "trap", question: "Q", answer: "c", answer_options: ["a", "b", "c"] }),
    null,
    "answer is among the options"
  );
  assert.equal(
    validateIndexEnigma({ enigma_type: "trap", question: "Q", answer: "z", answer_options: ["a", "b"] }),
    "The correct answer must be one of the answer options"
  );
  assert.equal(
    validateIndexEnigma({ answer_options: ["a", "b"] }),
    null,
    "options alone (partial PUT) with no answer is fine"
  );
});

test("validateIndexEnigma forbids traps from being sequence steps", () => {
  assert.notEqual(
    validateIndexEnigma({ enigma_type: "trap", question: "Q", answer: "a", sequence_order: 5 }),
    null,
    "a trap with a positive sequence position is rejected"
  );
  assert.equal(
    validateIndexEnigma({ enigma_type: "trap", question: "Q", answer: "a", sequence_order: 0 }),
    null,
    "an unsequenced trap is valid"
  );
  assert.equal(
    validateIndexEnigma({ enigma_type: "enigma", question: "Q", answer: "a", sequence_order: 5 }),
    null,
    "safe enigmas keep their sequence position"
  );
});

test("parseAnswerOptions decodes stored JSON arrays and tolerates garbage", () => {
  assert.deepEqual(parseAnswerOptions('["steam","coal"]'), ["steam", "coal"]);
  assert.equal(parseAnswerOptions(null), null);
  assert.equal(parseAnswerOptions(undefined), null);
  assert.equal(parseAnswerOptions("not json"), null);
  assert.equal(parseAnswerOptions('{"a":1}'), null);
  assert.deepEqual(parseAnswerOptions("[]"), []);
});