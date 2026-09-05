import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api } from "../helpers/auth";
import { createUser } from "../helpers/db";
import {
  getActiveGame,
  getRoundForGame,
  getIndexesForGame,
  getQrCodeForIndex,
  resetActiveRoundClock,
} from "../helpers/db";
import { createQrPayload, encodeQrPayload } from "../helpers/qr";

const SUF = Date.now().toString(36);
const PW = "TestPass_2026!";
// Two distinct players in two distinct teams, one per browser context/session.
const A = `qa_sse_a_${SUF}`;
const B = `qa_sse_b_${SUF}`;
const TEAM_A = `QA-SSE-Alpha-${Date.now()}`;
const TEAM_B = `QA-SSE-Beta-${Date.now()}`;

let createdUsernames: string[] = [];

async function authPlayer(page: Page, username: string): Promise<void> {
  await createUser(username, PW);
  await loginAs(page, username, PW);
  createdUsernames.push(username);
}

async function joinTeam(page: Page, name: string): Promise<void> {
  const res = await api<{ success: boolean }>(page, "/api/v1/players/me/team", {
    method: "POST",
    body: { team_name: name },
  });
  expect(res.json.success).toBe(true);
}

/**
 * Extract a team's leaderboard score from its row on a leaderboard page.
 *
 * The leaderboard renders each team as `div.flex.items-center` (the row) whose
 * name column (`div.flex-1`) holds the team <p> and the right column
 * (`div.text-right`) holds the score `<p class="font-headline text-lg">`.
 * Scoping the row by `hasText` + the exact unique team name, then reading the
 * sole `.text-lg` inside it, is robust — a plain `ancestor::div[class~=flex]`
 * XPath is not used because every inner column contains the substring "flex".
 */
async function teamScore(page: Page, teamName: string): Promise<number> {
  const row = page.locator("div.flex.items-center", { hasText: teamName });
  const text = (await row.locator("p.font-headline.text-lg").textContent())?.trim();
  return Number(text);
}

test.afterAll(async () => {
  if (createdUsernames.length === 0) return;
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdUsernames);
  createdUsernames = [];
});

test.describe("SSE live updates", () => {
  test("leaderboard propagates a teammate score to another session without a reload", async ({
    browser,
    collect,
  }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    // Route both boards' console/page/network errors into the assertion buffer.
    collect(pageA);
    collect(pageB);

    const game = await getActiveGame();
    const round = await getRoundForGame(game.id, game.current_round);
    const indexes = await getIndexesForGame(game.id, round.id);
    // Single-claim seeded codes: index 0/1 are reserved by scan.spec.
    const index = indexes[2];
    const qrCode = await getQrCodeForIndex(index.id, round.id);

    await authPlayer(pageA, A);
    await authPlayer(pageB, B);
    await joinTeam(pageA, TEAM_A);
    await joinTeam(pageB, TEAM_B);

    // Both players watch the same active game's live leaderboard.
    await pageA.goto("/leaderboard");
    await pageB.goto("/leaderboard");
    await expect(pageA.getByRole("heading", { name: "Live Leaderboard" })).toBeVisible();
    await expect(pageB.getByRole("heading", { name: "Live Leaderboard" })).toBeVisible();

    // Wait until both teams are visible on BOTH boards (proves SSE connected).
    await expect(pageB.getByText(TEAM_A)).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByText(TEAM_B)).toBeVisible();

    // Read team A's starting score on B's board.
    const startScore = await teamScore(pageB, TEAM_A);
    expect(Number.isFinite(startScore)).toBe(true);

    // Use A's session (cookies in ctxA) to scan a checkpoint: this awards
    // points to team A and, on the very next leaderboard SSE poll, B's board
    // must show the higher score — with no reload/navigation.
    const payload = encodeQrPayload(createQrPayload(index.id, game.id, round.id, qrCode.id));
    const res = await api<{ success: boolean; data?: { points_earned: number } }>(
      pageA,
      `/api/v1/games/${game.id}/scan`,
      { method: "POST", body: { qr_data: payload } }
    );
    expect(res.json.success).toBe(true);
    const earned = res.json.data?.points_earned ?? 0;
    expect(earned).toBeGreaterThan(0);

    await expect
      .poll(async () => teamScore(pageB, TEAM_A), { timeout: 15000 })
      .toBe(startScore + earned);

    // Confirm B's page never navigated during the wait.
    expect(new URL(pageB.url()).pathname).toBe("/leaderboard");

    await ctxA.close();
    await ctxB.close();
  });

  test("timer stays live on the leaderboard for both sessions", async ({
    browser,
    collect,
  }) => {
    const game = await getActiveGame();
    // The seeded round may have already elapsed (remaining 0), which renders a
    // static 00:00. Rewind the clock so the live countdown actually ticks.
    await resetActiveRoundClock(game.id);

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const page = await ctxA.newPage();
    collect(page);
    await ctxB.newPage();

    await authPlayer(page, A);

    await page.goto("/leaderboard");
    await expect(page.getByRole("heading", { name: "Live Leaderboard" })).toBeVisible();

    // The connected pulse dot appears once the timer SSE opens.
    await expect(page.locator(".bg-primary.animate-pulse").first()).toBeVisible({
      timeout: 10000,
    });

    // Read the MM:SS timer twice; the local countdown ticks every second, so
    // the value must strictly change without any navigation.
    const fmt = page.getByText(/^\d\d:\d\d$/);
    await expect(fmt.first()).toBeVisible({ timeout: 10000 });
    const t0 = (await fmt.first().textContent())?.trim();
    expect(t0).not.toBe("00:00");
    await page.waitForTimeout(2500);
    const t1 = (await fmt.first().textContent())?.trim();
    expect(t1).not.toBe(t0);
    expect(new URL(page.url()).pathname).toBe("/leaderboard");

    await ctxA.close();
    await ctxB.close();
  });
});