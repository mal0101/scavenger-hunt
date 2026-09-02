import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api } from "../helpers/auth";
import { getActiveGame, getRoundForGame, getIndexesForGame } from "../helpers/db";
import { createQrPayload, encodeQrPayload, qrDataUrl } from "../helpers/qr";
import { syntheticCameraInitScript } from "../helpers/camera";

const P1 = "+212699910010";
const P2 = "+212699910011";
let createdPhones: string[] = [];

test.afterAll(async () => {
  if (createdPhones.length === 0) return;
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdPhones);
  createdPhones = [];
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
}

async function setup(): Promise<ScanFixture> {
  const game = await getActiveGame();
  const round = await getRoundForGame(game.id, game.current_round);
  const indexes = await getIndexesForGame(game.id, round.id);
  return { gameId: game.id, roundId: round.id, index: indexes[0] };
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
    const { gameId, roundId, index } = await setup();
    await loginAs(page, P1);
    createdPhones.push(P1);
    await joinTeam(page);

    // Forge a valid signed payload and render it in the synthetic camera.
    const encoded = encodeQrPayload(createQrPayload(index.id, gameId, roundId));
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
    expect(Number(result.points_earned)).toBeGreaterThan(0);

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
  });

  test("tampered QR shows an error banner and stays on the scanner", async ({ page, context }) => {
    const { gameId, roundId, index } = await setup();
    await loginAs(page, P2);
    createdPhones.push(P2);
    await joinTeam(page);

    const badOtp = createQrPayload(index.id, gameId, roundId);
    badOtp.signature = "0".repeat(64);
    const encoded = encodeQrPayload(badOtp);
    const url = await qrDataUrl(encoded);
    await context.addInitScript(syntheticCameraInitScript(url));

    await page.goto("/scan");
    await page.getByRole("button", { name: "Start Scanner" }).click();

    // API response message is "QR code invalid: QR_SIGNATURE_INVALID".
    await expect(page.getByText(/invalid/i).first()).toBeVisible({ timeout: 45000 });
    expect(new URL(page.url()).pathname).toBe("/scan");
  });

  test("unavailable camera surfaces actionable UX and does not crash", async ({ page }) => {
    await loginAs(page, P1);
    createdPhones.push(P1);
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
});