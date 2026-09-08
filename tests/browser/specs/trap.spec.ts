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
const P1 = `qa_trp_p1_${SUF}`;
const P2 = `qa_trp_p2_${SUF}`;
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

// The seeded course ends with the 4 floor-question traps (QCM). They are
// STANDALONE markers: sequence_order 0, so a team with zero prior scans can
// hit one at any moment. Pick the first trap deterministically by enigma_type
// — never by content strings, which the course authors tune.
async function setup() {
  const game = await getActiveGame();
  const indexes = await getIndexesForGame(game.id);
  const index = indexes.find((idx) => idx.enigma_type === "trap") ?? null;
  if (!index) throw new Error("Seed trap not found");
  if (index.sequence_order !== 0) {
    throw new Error(`Expected trap to be unsequenced, got sequence_order ${index.sequence_order}`);
  }
  const qrCode = await getQrCodeForIndex(index.id);
  return { gameId: game.id, index, codeId: qrCode.id };
}

async function joinTeam(page: Page): Promise<void> {
  const res = await api<{ success: boolean; data?: { invite_code: string } }>(
    page,
    "/api/v1/players/me/team",
    { method: "POST", body: { team_name: `QA-Trap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } }
  );
  if (!res.json?.success) {
    throw new Error(`Team creation failed: ${JSON.stringify(res.json)}`);
  }
}

/** POST the signed trap QR through the API (the same validator the camera
 *  path drives) and return the pending trap scan response. */
async function scanTrapViaApi(page: Page, gameId: string, index: { id: string }, codeId: string) {
  const encoded = encodeQrPayload(createQrPayload(index.id, gameId, codeId));
  const res = await api<{
    success: boolean;
    data?: { scan_id: string; index?: { label: string; type: string | null }; pending?: boolean; question?: string | null; at_risk?: number; answer_options?: string[] | null; hint?: string | null };
    message?: string;
    error?: string;
  }>(page, `/api/v1/games/${gameId}/scan`, { method: "POST", body: { qr_data: encoded } });
  return { encoded, res };
}

test.describe("trap challenge", () => {
  test("an unsequenced trap QR is scannable with zero prior scans and a wrong answer drains points", async ({
    page,
  }) => {
    await authPlayer(page, P1);
    await joinTeam(page);
    const { gameId, index, codeId } = await setup();
    // No prior steps are unlocked: the trap must fire immediately (sequence 0).
    const { res } = await scanTrapViaApi(page, gameId, index, codeId);

    // A trap yields no immediate points and stays pending.
    expect(res.json.success).toBe(true);
    expect(res.json.data?.pending).toBe(true);
    expect(res.json.data?.question).toBeTruthy();
    expect(res.json.data?.at_risk).toBe(index.points);
    expect(res.json.data?.answer_options).toEqual(
      JSON.parse(index.answer_options ?? "null")
    );
    // The trap is an index too — its hint must ride along in the scan payload.
    expect(res.json.data?.hint).toBe(index.hint);
    const scanId = res.json.data!.scan_id;

    // Navigate through the app like the camera flow would: scan-result with
    // the trap payload, then the trap question/answer page.
    const payload = encodeURIComponent(
      JSON.stringify({
        index_label: index.label,
        game_id: gameId,
        points_earned: 0,
        team_total: 0,
        scan_id: scanId,
        question: res.json.data?.question,
        at_risk: index.points,
        answer_options: res.json.data?.answer_options,
        hint: res.json.data?.hint,
      })
    );

    // Scan-result surfaces the trap card and the question.
    await page.goto(`/scan-result?type=trap&data=${payload}`);
    await expect(page.getByText("TRAP TRIGGERED")).toBeVisible();
    await expect(page.getByText(res.json.data!.question!, { exact: false })).toBeVisible();
    // The trap's hint is revealed on the scan-result card when the course
    // defines one; a hint-less trap renders no panel at all.
    if (index.hint) {
      await expect(page.getByText("Next Checkpoint Hint")).toBeVisible();
      await expect(page.getByText(index.hint, { exact: false })).toBeVisible();
    } else {
      await expect(page.getByText("Next Checkpoint Hint")).not.toBeVisible();
    }

    // Player/team balance reflects zero until the answer settles.
    const before = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    expect(before.json?.data?.total_score).toBe(0);

    // Engage the trap page and answer WRONG.
    await page.getByText("Engage Manual Override").click();
    await page.waitForURL("**/trap?data=*");
    await expect(page.getByText("Tidal Trap")).toBeVisible();
    // The challenge page carries the hint through the same payload (when set).
    if (index.hint) {
      await expect(page.getByText("Next Checkpoint Hint")).toBeVisible();
      await expect(page.getByText(index.hint, { exact: false })).toBeVisible();
    } else {
      await expect(page.getByText("Next Checkpoint Hint")).not.toBeVisible();
    }

    // The trap is multiple choice — the proposed options render as buttons.
    await expect(page.getByRole("radiogroup")).toBeVisible();
    const options = JSON.parse(index.answer_options ?? "[]") as string[];
    const wrongOption = options.find((o) => o !== index.answer) ?? options[0];
    if (!wrongOption) throw new Error("Trap has no answer options to pick from");
    await page.getByRole("radio", { name: wrongOption }).click();
    await page.getByRole("button", { name: "Seal the Bulkhead" }).click();

    await expect(page.getByText("MANIFOLD BREACHED")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`-${index.points} pts lost`)).toBeVisible();

    // Balance dropped by the full trap points (on top of the zero base).
    const after = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    expect(after.json?.data?.total_score).toBe(-index.points);
    expect(after.json?.data?.team?.total_score).toBe(-index.points);
  });

  test("a trap QR stays scannable for another team and a correct answer only halved the penalty", async ({
    page,
  }) => {
    await authPlayer(page, P2);
    await joinTeam(page);
    const { gameId, index, codeId } = await setup();

    // The same trap code is NOT depleted for a second team (no prior scans).
    const { res } = await scanTrapViaApi(page, gameId, index, codeId);
    expect(res.json.success).toBe(true);
    expect(res.json.data?.pending).toBe(true);
    expect(res.json.data?.question).toBeTruthy();
    expect(res.json.data?.at_risk).toBe(index.points);

    // Answer correctly through the API: only half the points at risk are
    // deducted (the penalty is halved, it is no longer a reward).
    const half = -Math.round(index.points * 0.5);
    const answer = await api<{
      success: boolean;
      data?: { correct: boolean; delta: number; team_total: number };
      message?: string;
      error?: string;
    }>(
      page,
      `/api/v1/games/${gameId}/trap/${res.json.data!.scan_id}/answer`,
      { method: "POST", body: { answer: index.answer ?? "steam" } }
    );
    expect(answer.json.success).toBe(true);
    expect(answer.json.data?.correct).toBe(true);
    expect(answer.json.data?.delta).toBe(half);

    const profile = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    expect(profile.json?.data?.total_score).toBe(half);

    // Re-answering the same scan is rejected.
    const again = await api<{ success: boolean; error?: string }>(
      page,
      `/api/v1/games/${gameId}/trap/${res.json.data!.scan_id}/answer`,
      { method: "POST", body: { answer: index.answer ?? "" } }
    );
    expect(again.json.success).toBe(false);
    expect(again.json.error).toBe("TRAP_ALREADY_RESOLVED");
  });
});