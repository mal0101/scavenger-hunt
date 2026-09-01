import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  getTargetState,
  calculateScanScore,
  calculateEliminationThreshold,
  getEliminatedTeams,
} from "@/lib/game/engine";

const ALL_ACTIONS = ["start", "eliminate", "next_round", "finish", "reset"];
const STATES = ["PENDING", "ACTIVE", "ELIMINATING", "FINISHED"] as const;

test("canTransition accepts every valid transition in the state machine", () => {
  const valid: Array<[string, string]> = [
    ["PENDING", "start"],
    ["ACTIVE", "eliminate"],
    ["ELIMINATING", "next_round"],
    ["ELIMINATING", "finish"],
    ["FINISHED", "reset"],
  ];
  for (const [from, action] of valid) {
    assert.equal(canTransition(from as never, action), true, `${from}+${action}`);
  }
});

test("canTransition rejects illegal transitions and unknown actions", () => {
  for (const state of STATES) {
    for (const action of ALL_ACTIONS) {
      const isLegal = (state === "PENDING" && action === "start") ||
        (state === "ACTIVE" && action === "eliminate") ||
        (state === "ELIMINATING" && (action === "next_round" || action === "finish")) ||
        (state === "FINISHED" && action === "reset");
      assert.equal(canTransition(state, action), isLegal, `${state}+${action}`);
    }
  }
  assert.equal(canTransition("ACTIVE", "bogus"), false);
});

test("getTargetState returns the correct destination state", () => {
  assert.equal(getTargetState("PENDING", "start"), "ACTIVE");
  assert.equal(getTargetState("ACTIVE", "eliminate"), "ELIMINATING");
  assert.equal(getTargetState("ELIMINATING", "next_round"), "ACTIVE");
  assert.equal(getTargetState("ELIMINATING", "finish"), "FINISHED");
  assert.equal(getTargetState("FINISHED", "reset"), "PENDING");
  assert.equal(getTargetState("ACTIVE", "bogus"), null);
  assert.equal(getTargetState("PENDING", "reset"), null);
});

test("calculateScanScore: remaining = total gives the 1.5x multiplier", () => {
  assert.equal(calculateScanScore(50, 1800, 1800), 75);
});

test("calculateScanScore: no time left scores exactly the base points", () => {
  assert.equal(calculateScanScore(50, 0, 1800), 50);
});

test("calculateScanScore: half time left is a 1.25x multiplier", () => {
  assert.equal(calculateScanScore(40, 900, 1800), 50);
});

test("calculateScanScore: totalTime <= 0 degenerates to base points", () => {
  assert.equal(calculateScanScore(25, 0, 0), 25);
  assert.equal(calculateScanScore(25, 100, -5), 25);
});

test("calculateEliminationThreshold: empty list returns 0", () => {
  assert.equal(calculateEliminationThreshold([], 0.2), 0);
});

test("calculateEliminationThreshold: indexes the floored eliminationPct slice", () => {
  const scores = [100, 90, 80, 70, 60];
  // idx = floor(5 * 0.2) = 1 -> 90 ; idx = floor(5 * 0.5) = 2 -> 80
  assert.equal(calculateEliminationThreshold(scores, 0.2), 90);
  assert.equal(calculateEliminationThreshold(scores, 0.5), 80);
});

test("calculateEliminationThreshold: pct beyond list length clamps to last element", () => {
  assert.equal(calculateEliminationThreshold([50, 40], 2.0), 40);
});

test("getEliminatedTeams: a single team is never eliminated", () => {
  assert.deepEqual(getEliminatedTeams([{ id: "a", total_score: 50 }], 0.2), []);
});

test("getEliminatedTeams: eliminates teams strictly below the threshold", () => {
  const teams = [
    { id: "a", total_score: 100 },
    { id: "b", total_score: 90 },
    { id: "c", total_score: 80 },
    { id: "d", total_score: 70 },
    { id: "e", total_score: 60 },
    { id: "f", total_score: 50 },
  ];
  // idx = floor(6 * 0.2) = 1 -> threshold = 90 -> anything strictly below goes.
  assert.deepEqual(getEliminatedTeams(teams, 0.2).sort(), ["c", "d", "e", "f"]);
});

test("getEliminatedTeams: falls back to the lowest team when none fall below", () => {
  const teams = [
    { id: "a", total_score: 80 },
    { id: "b", total_score: 75 },
  ];
  assert.deepEqual(getEliminatedTeams(teams, 0.2), ["b"]);
});

test("getEliminatedTeams: exact ties at the threshold are kept", () => {
  const teams = [
    { id: "a", total_score: 80 },
    { id: "b", total_score: 60 },
    { id: "c", total_score: 60 },
    { id: "d", total_score: 30 },
    { id: "e", total_score: 20 },
  ];
  // idx = floor(5 * 0.2) = 1 -> threshold = 60; ties at 60 survive.
  assert.deepEqual(getEliminatedTeams(teams, 0.2).sort(), ["d", "e"]);
});