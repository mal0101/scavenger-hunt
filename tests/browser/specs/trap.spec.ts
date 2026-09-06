import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api } from "../helpers/auth";
import {
  getActiveGame,
  getIndexesForGame,
  getQrCodeForIndex,
  createUser,
} from "../helpers/db";
import { createQrPayload, encodeQrPayload } from "../helpers/qr";

const SUF = Date.now().toString(36);
const PW = "TestPass_2026!";
const P1 = `qa_trp_p1_${SUF}`;
const P2 = `qa_trp_p2_${SUF}`;
let createdUsernames: string[] = [];

// A seeded trap (40 pt "The Pressure Gauge", answer "steam"). We pick it by
// enigma_type instead of a positional offset because QA indexes created by the
// mentor specs share the same round and shift array positions.
const TRAP_QUESTION = "What moves steam through the city below?";

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

async function setup() {
  const game = await getActiveGame();
  const indexes = await getIndexesForGame(game.id);
  const index = indexes.find(
    (idx) => idx.enigma_type === "trap" && idx.question === TRAP_QUESTION
  );
  const qrCode = await getQrCodeForIndex(index!.id);
  return { gameId: game.id, index: index!, codeId: qrCode.id };
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
    data?: { scan_id: string; index?: { label: string; type: string | null }; pending?: boolean; question?: string | null; at_risk?: number };
    message?: string;
    error?: string;
  }>(page, `/api/v1/games/${gameId}/scan`, { method: "POST", body: { qr_data: encoded } });
  return { encoded, res };
}

test.describe("trap challenge", () => {
  test("trap scan settles no points, shows the question, and a wrong answer drains points", async ({
    page,
  }) => {
    await authPlayer(page, P1);
    await joinTeam(page);
    const { gameId, index, codeId } = await setup();
    const { res } = await scanTrapViaApi(page, gameId, index, codeId);

    // A trap yields no immediate points and stays pending.
    expect(res.json.success).toBe(true);
    expect(res.json.data?.pending).toBe(true);
    expect(res.json.data?.question).toBeTruthy();
    expect(res.json.data?.at_risk).toBe(index.points);
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
      })
    );

    // Scan-result surfaces the trap card and the question.
    await page.goto(`/scan-result?type=trap&data=${payload}`);
    await expect(page.getByText("TRAP TRIGGERED")).toBeVisible();
    await expect(page.getByText(res.json.data!.question!, { exact: false })).toBeVisible();

    // Player/team balance is untouched until the answer settles.
    const before = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    expect(before.json?.data?.total_score).toBe(0);

    // Engage the trap page and answer WRONG.
    await page.getByText("Engage Manual Override").click();
    await page.waitForURL("**/trap?data=*");
    await expect(page.getByText("Tidal Trap")).toBeVisible();
    await page.getByPlaceholder("Enter your answer…").fill("wrong");
    await page.getByRole("button", { name: "Seal the Bulkhead" }).click();

    await expect(page.getByText("MANIFOLD BREACHED")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`-${index.points} pts lost`)).toBeVisible();

    // Balance dropped by the full trap points.
    const after = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    expect(after.json?.data?.total_score).toBe(-index.points);
    expect(after.json?.data?.team?.total_score).toBe(-index.points);
  });

  test("a trap QR stays scannable for another team and a correct answer earns 50% of the risk", async ({
    page,
  }) => {
    await authPlayer(page, P2);
    await joinTeam(page);
    const { gameId, index, codeId } = await setup();

    // The same trap code is NOT depleted for a second team.
    const { res } = await scanTrapViaApi(page, gameId, index, codeId);
    expect(res.json.success).toBe(true);
    expect(res.json.data?.pending).toBe(true);
    expect(res.json.data?.question).toBeTruthy();
    expect(res.json.data?.at_risk).toBe(index.points);

    // Answer correctly through the API: earns half of the points at risk.
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
    expect(answer.json.data?.delta).toBe(Math.round(index.points * 0.5));

    const profile = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    expect(profile.json?.data?.total_score).toBe(Math.round(index.points * 0.5));

    // Re-answering the same scan is rejected.
    const again = await api<{ success: boolean; error?: string }>(
      page,
      `/api/v1/games/${gameId}/trap/${res.json.data!.scan_id}/answer`,
      { method: "POST", body: { answer: "steam" } }
    );
    expect(again.json.success).toBe(false);
    expect(again.json.error).toBe("TRAP_ALREADY_RESOLVED");
  });
});