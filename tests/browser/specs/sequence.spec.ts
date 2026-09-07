import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api } from "../helpers/auth";
import {
  getActiveGame,
  getIndexesForGame,
  getQrCodeForIndex,
  createUser,
  rearmSeededCodes,
} from "../helpers/db";
import { createQrPayload, encodeQrPayload } from "../helpers/qr";

const SUF = Date.now().toString(36);
const PW = "TestPass_2026!";
const P1 = `qa_seq_p1_${SUF}`;
let createdUsernames: string[] = [];

async function authPlayer(page: Page, username: string): Promise<void> {
  await createUser(username, PW);
  await loginAs(page, username, PW);
  createdUsernames.push(username);
}

test.afterAll(async () => {
  if (createdUsernames.length === 0) return;
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdUsernames);
  createdUsernames = [];
});

test.beforeAll(async () => {
  await rearmSeededCodes((await getActiveGame()).id);
});

async function joinTeam(page: Page): Promise<void> {
  const res = await api<{ success: boolean }>(page, "/api/v1/players/me/team", {
    method: "POST",
    body: { team_name: `QA-Seq-${Date.now()}` },
  });
  expect(res.json.success).toBe(true);
}

/** POST a forged signed QR through the session (same validator the camera
 *  path drives) and return the API envelope. */
async function scanIndex(page: Page, gameId: string, indexId: string) {
  const qr = await getQrCodeForIndex(indexId);
  return api<{
    success: boolean;
    error?: string;
    message?: string;
    data?: { points_earned?: number; hint?: string | null };
  }>(page, `/api/v1/games/${gameId}/scan`, {
    method: "POST",
    body: { qr_data: encodeQrPayload(createQrPayload(indexId, gameId, qr.id)) },
  });
}

test.describe("sequential course locking", () => {
  test("markers unlock only after every earlier step is scanned, and hints arrive after a secure", async ({
    page,
  }) => {
    const game = await getActiveGame();
    const indexes = await getIndexesForGame(game.id);
    const step1 = indexes.find((i) => i.sequence_order === 1);
    const step2 = indexes.find((i) => i.sequence_order === 2);
    const step3 = indexes.find((i) => i.sequence_order === 3);
    if (!step1 || !step2 || !step3) {
      throw new Error("Seeded game is missing sequenced steps 1-3");
    }

    await authPlayer(page, P1);
    await joinTeam(page);

    // Skipping straight to step 3 is refused before step 1 is scanned.
    const skip = await scanIndex(page, game.id, step3.id);
    expect(skip.json.success).toBe(false);
    expect(skip.json.error).toBe("SEQUENCE_LOCKED");

    // Step 1 is always available and reveals the hint for the next checkpoint.
    const s1 = await scanIndex(page, game.id, step1.id);
    expect(s1.json.success).toBe(true);
    expect(s1.json.data?.points_earned).toBe(step1.points);
    expect(s1.json.data?.hint).toBe(step1.hint);

    // Step 3 is still locked until step 2 is scanned too.
    const stillLocked = await scanIndex(page, game.id, step3.id);
    expect(stillLocked.json.success).toBe(false);
    expect(stillLocked.json.error).toBe("SEQUENCE_LOCKED");

    // Step 2 unlocks, then step 3 works and reports the next hint.
    const s2 = await scanIndex(page, game.id, step2.id);
    expect(s2.json.success).toBe(true);
    expect(s2.json.data?.points_earned).toBe(step2.points);

    const s3 = await scanIndex(page, game.id, step3.id);
    expect(s3.json.success).toBe(true);
    expect(s3.json.data?.points_earned).toBe(step3.points);
    expect(s3.json.data?.hint).toBe(step3.hint);

    // The team banked exactly the points for steps 1-3.
    const profile = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    const expected = step1.points + step2.points + step3.points;
    expect(profile.json?.data?.total_score).toBe(expected);
    expect(profile.json?.data?.team?.total_score).toBe(expected);
  });
});