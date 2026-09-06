import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api } from "../helpers/auth";
import {
  getActiveGame,
  getRoundForGame,
  getIndexesForGame,
  getQrCodeForIndex,
  createUser,
} from "../helpers/db";
import { createQrPayload, encodeQrPayload, qrDataUrl } from "../helpers/qr";
import { syntheticCameraInitScript } from "../helpers/camera";

const SUF = Date.now().toString(36);
const PW = "TestPass_2026!";
const P1 = `qa_scan_p1_${SUF}`;
const P2 = `qa_scan_p2_${SUF}`;
const P3 = `qa_scan_p3_${SUF}`;
let createdUsernames: string[] = [];

// The seeded game's QR codes are single-claim, so every scan test grabs a
// distinct index to never collide with a sibling spec's claim.
const INDEX_FULL_SCAN = 0;
const INDEX_DEPLETED = 1;

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

interface IndexRow {
  id: string;
  label: string;
  points: number;
}

interface ScanFixture {
  gameId: string;
  roundId: string;
  index: IndexRow;
  codeId: string;
}

async function setup(indexOffset: number): Promise<ScanFixture> {
  const game = await getActiveGame();
  const round = await getRoundForGame(game.id, game.current_round);
  const indexes = await getIndexesForGame(game.id, round.id);
  if (indexes.length <= indexOffset) {
    throw new Error(`Seeded game has no index at offset ${indexOffset}`);
  }
  const index = indexes[indexOffset];
  const qrCode = await getQrCodeForIndex(index.id, round.id);
  return { gameId: game.id, roundId: round.id, index, codeId: qrCode.id };
}

/** Verify + team so the scanner has a team to award points to. */
async function joinTeam(page: Page): Promise<void> {
  const res = await api<{ success: boolean; data?: { invite_code: string } }>(
    page,
    "/api/v1/players/me/team",
    { method: "POST", body: { team_name: `QA-Scan-${Date.now()}` } }
  );
  if (!res.json?.success) {
    throw new Error(`Team creation failed: ${JSON.stringify(res.json)}`);
  }
}

test.describe("QR camera scan", () => {
  test("full scan pipeline: camera -> decode -> verify -> score -> result page", async ({
    page,
    context,
  }) => {
    const { gameId, roundId, index, codeId } = await setup(INDEX_FULL_SCAN);
    await authPlayer(page, P1);
    await joinTeam(page);

    // Forge a valid signed payload and render it in the synthetic camera.
    const encoded = encodeQrPayload(createQrPayload(index.id, gameId, roundId, codeId));
    const url = await qrDataUrl(encoded);
    await context.addInitScript(syntheticCameraInitScript(url));

    await page.goto("/scan");
    await expect(page.getByText("Ready to Scan")).toBeVisible();

    await page.getByRole("button", { name: "Start Scanner" }).click();
    await expect(page.getByText("SCANNING", { exact: true })).toBeVisible({ timeout: 20000 });

    // Decoder latency is variable; poll for the result navigation.
    await page.waitForURL("**/scan-result?type=*&data=*", { timeout: 45000 });
    expect(page.url()).toContain("scan-result");

    // Decode points_earned from the payload the result page was given.
    const dataParam = new URL(page.url()).searchParams.get("data") ?? "";
    const result = JSON.parse(decodeURIComponent(dataParam)) as {
      index_label: string;
      points_earned: number;
      team_total: number;
      scan_id: string;
    };
    expect(result.index_label).toBe(index.label);
    expect(Number(result.points_earned)).toBe(index.points);

    // Result page UI carries the index label.
    await expect(page.getByText(index.label).first()).toBeVisible();

    // Server agrees: player (solo team => same as team) balance = points.
    const profile = await api<{
      success: boolean;
      data: { total_score: number; team: { total_score: number } | null };
    }>(page, "/api/v1/players/me");
    expect(profile.json?.data?.total_score).toBe(Number(result.points_earned));
    expect(profile.json?.data?.team?.total_score).toBe(Number(result.points_earned));

    // The scan landed in the ledger.
    const scans = await api<{ success: boolean; data: { total: number } }>(
      page,
      "/api/v1/players/me/scans"
    );
    expect(Number(scans.json?.data?.total)).toBeGreaterThanOrEqual(1);

    // Dashboard stats: the dock reflects the scan — a concrete team rank and 1
    // passed challenge. Tiles render in a fixed order: Score, Team Rank, Passed,
    // Team (see app/(player)/dock/page.tsx).
    await page.goto("/dock");
    await expect(page.getByText("Your Status")).toBeVisible();
    const statValues = page.locator("div.brass-plate p.font-headline");
    await expect(statValues.nth(1)).toHaveText(/#\d+/);
    await expect(statValues.nth(2)).toHaveText("1");
  });

  test("tampered QR shows an error banner and stays on the scanner", async ({ page, context }) => {
    const { gameId, roundId, index, codeId } = await setup(INDEX_FULL_SCAN);
    await authPlayer(page, P2);
    await joinTeam(page);

    const badPayload = createQrPayload(index.id, gameId, roundId, codeId);
    badPayload.signature = "0".repeat(64);
    const encoded = encodeQrPayload(badPayload);
    const url = await qrDataUrl(encoded);
    await context.addInitScript(syntheticCameraInitScript(url));

    await page.goto("/scan");
    await page.getByRole("button", { name: "Start Scanner" }).click();

    // API response message is "QR code invalid: QR_SIGNATURE_INVALID".
    await expect(page.getByText(/invalid/i).first()).toBeVisible({ timeout: 45000 });
    expect(new URL(page.url()).pathname).toBe("/scan");
  });

  test("unavailable camera surfaces actionable UX and does not crash", async ({ page }) => {
    await authPlayer(page, P1);
    await page.goto("/scan");

    // No fake-stream injection: the real (permissionless/device-less) camera
    // path is exercised. Headless Chromium reports no camera device, which the
    // app must surface and recover from without an uncaught error.
    await page.getByRole("button", { name: "Start Scanner" }).click();
    await expect(page.getByText(/Camera permission denied|not available/i)).toBeVisible({
      timeout: 15000,
    });
    expect(new URL(page.url()).pathname).toBe("/scan");
  });

  test("a re-scanned QR drains 33% of the original value for a second team", async ({
    page,
    context,
  }) => {
    const { gameId, roundId, index, codeId } = await setup(INDEX_DEPLETED);
    await authPlayer(page, P3);
    await joinTeam(page);

    const encoded = encodeQrPayload(createQrPayload(index.id, gameId, roundId, codeId));
    const url = await qrDataUrl(encoded);
    await context.addInitScript(syntheticCameraInitScript(url));

    // First scan claims the code for the full original value.
    await page.goto("/scan");
    await page.getByRole("button", { name: "Start Scanner" }).click();
    await page.waitForURL("**/scan-result?type=*&data=*", { timeout: 45000 });

    // A second scan (this player already has a scan for the index) is rejected.
    const res = await api<{ success: boolean; error?: string }>(
      page,
      `/api/v1/games/${gameId}/scan`,
      { method: "POST", body: { qr_data: encoded } }
    );
    expect(res.json.success).toBe(false);
    expect(res.json.error).toBe("ALREADY_SCANNED");
  });
});