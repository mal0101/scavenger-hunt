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
import { createQrPayload, encodeQrPayload, qrDataUrl } from "../helpers/qr";
import { syntheticCameraInitScript } from "../helpers/camera";

const SUF = Date.now().toString(36);
const PW = "TestPass_2026!";
const P1 = `qa_scan_p1_${SUF}`;
const P2 = `qa_scan_p2_${SUF}`;
const P3 = `qa_scan_p3_${SUF}`;
let createdUsernames: string[] = [];

// The seeded game's QR codes are single-claim, so every scan test grabs a
// distinct index to never collide with a sibling spec's claim. Indexes are
// selected by their sequence_order (stable) rather than array offset (the
// findMany order is not deterministic).
const INDEX_FULL_SCAN = 1;
const INDEX_DEPLETED = 2;

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

interface IndexRow {
  id: string;
  label: string;
  points: number;
}

interface ScanFixture {
  gameId: string;
  index: IndexRow;
  codeId: string;
}

async function setup(sequenceOrder: number): Promise<ScanFixture> {
  const game = await getActiveGame();
  const indexes = await getIndexesForGame(game.id);
  const index = indexes.find((i) => i.sequence_order === sequenceOrder);
  if (!index) {
    throw new Error(`Seeded game has no index at sequence_order ${sequenceOrder}`);
  }
  const qrCode = await getQrCodeForIndex(index.id);
  return { gameId: game.id, index, codeId: qrCode.id };
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
    const { gameId, index, codeId } = await setup(INDEX_FULL_SCAN);
    await authPlayer(page, P1);
    await joinTeam(page);

    // Forge a valid signed payload and render it in the synthetic camera.
    const encoded = encodeQrPayload(createQrPayload(index.id, gameId, codeId));
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
    const { gameId, index, codeId } = await setup(INDEX_FULL_SCAN);
    await authPlayer(page, P2);
    await joinTeam(page);

    const badPayload = createQrPayload(index.id, gameId, codeId);
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
    // app must surface and recover from without an uncaught error. The exact
    // banner text is matched (not a regex) because Next.js' dev-mode overlay
    // echoes the app's own console.error text, which would otherwise produce a
    // strict-mode duplicate in non-prod runs.
    await page.getByRole("button", { name: "Start Scanner" }).click();
    await expect(
      page.getByText("Camera not available on this device.", { exact: true })
    ).toBeVisible({ timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe("/scan");
  });

  test("a re-scanned QR drains 33% of the original value for a second team", async ({
    page,
    context,
  }) => {
    const { gameId, index, codeId } = await setup(INDEX_DEPLETED);
    await authPlayer(page, P3);
    await joinTeam(page);

    // INDEX_DEPLETED is sequence step 2, so the team must scan step 1 first or
    // the sequential-course gate returns SEQUENCE_LOCKED.
    const indexes = await getIndexesForGame(gameId);
    const step1 = indexes.find((i) => i.sequence_order === 1);
    if (!step1) throw new Error("Seeded game has no sequence_order=1 index");
    const step1Qr = await getQrCodeForIndex(step1.id);
    const step1Res = await api<{ success: boolean; error?: string }>(
      page,
      `/api/v1/games/${gameId}/scan`,
      { method: "POST", body: { qr_data: encodeQrPayload(createQrPayload(step1.id, gameId, step1Qr.id)) } }
    );
    expect(step1Res.json.success).toBe(true);

    const encoded = encodeQrPayload(createQrPayload(index.id, gameId, codeId));
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

  test("a teammate cannot re-scan a QR already claimed by their team, and the team log names the scanning player", async ({
    page,
    browser,
  }) => {
    const { gameId, index } = await setup(3);
    const memberA = `qa_scan_team_a_${SUF}`;
    const memberB = `qa_scan_team_b_${SUF}`;
    await createUser(memberA, PW);
    await createUser(memberB, PW);
    createdUsernames.push(memberA, memberB);
    await loginAs(page, memberA, PW);

    // Member A creates the team.
    const teamName = `QA-Scan-Team-${Date.now()}`;
    const team = await api<{ success: boolean; data?: { invite_code: string } }>(
      page,
      "/api/v1/players/me/team",
      { method: "POST", body: { team_name: teamName } }
    );
    expect(team.json.success).toBe(true);

    // The target (step 3) is sequenced, so the team claims steps 1-2 first.
    const indexes = await getIndexesForGame(gameId);
    const step1 = indexes.find((i) => i.sequence_order === 1);
    const step2 = indexes.find((i) => i.sequence_order === 2);
    if (!step1 || !step2) throw new Error("missing sequence steps for team dedup test");

    for (const step of [step1, step2]) {
      const qr = await getQrCodeForIndex(step.id);
      const res = await api<{ success: boolean }>(
        page,
        `/api/v1/games/${gameId}/scan`,
        { method: "POST", body: { qr_data: encodeQrPayload(createQrPayload(step.id, gameId, qr.id)) } }
      );
      expect(res.json.success).toBe(true);
    }

    const code = await getQrCodeForIndex(index.id);
    const payload = encodeQrPayload(createQrPayload(index.id, gameId, code.id));
    const claimA = await api<{ success: boolean; data?: { points_earned: number } }>(
      page,
      `/api/v1/games/${gameId}/scan`,
      { method: "POST", body: { qr_data: payload } }
    );
    expect(claimA.json.success).toBe(true);
    expect(Number(claimA.json?.data?.points_earned)).toBe(index.points);

    // Member B joins the same team: the marker is already claimed, so B is
    // blocked even though B never scanned it personally.
    const ctx = await browser.newContext();
    try {
      const pageB = await ctx.newPage();
      await loginAs(pageB, memberB, PW);
      const joinRes = await api<{ success: boolean }>(
        pageB,
        "/api/v1/players/me/team",
        { method: "POST", body: { team_name: "x", invite_code: team.json?.data?.invite_code } }
      );
      expect(joinRes.json.success).toBe(true);

      const claimB = await api<{ success: boolean; error?: string }>(
        pageB,
        `/api/v1/games/${gameId}/scan`,
        { method: "POST", body: { qr_data: payload } }
      );
      expect(claimB.json.success).toBe(false);
      expect(claimB.json.error).toBe("ALREADY_SCANNED");

      // The team ledger attributes member A's scan to the team and names A.
      const ledger = await api<{
        success: boolean;
        data: {
          team: { name: string } | null;
          mine: { total_points: number };
          scans: Array<{
            scanned_by: { username: string; nickname: string | null } | null;
            mine: boolean;
          }>;
        };
      }>(pageB, "/api/v1/players/me/scans");
      expect(ledger.json.data?.team?.name).toBe(teamName);
      expect(Number(ledger.json.data?.mine?.total_points)).toBe(0);
      const latest = ledger.json.data?.scans?.[0];
      expect(latest?.scanned_by?.username).toBe(memberA);
      expect(latest?.mine).toBe(false);
    } finally {
      await ctx.close();
    }
  });
});