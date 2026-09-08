import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD } from "../helpers/auth";
import {
  createQaGame,
  createUser,
  cleanupUsers,
  getActiveGame,
  getIndexesForGame,
  getQrCodeForIndex,
} from "../helpers/db";
import { createQrPayload, encodeQrPayload } from "../helpers/qr";

const PLAYER_PW = "TestPass_2026!";

let createdGameId: string | null = null;
let gameId: string;

test.beforeAll(async () => {
  const game = await getActiveGame();
  gameId = game.id;
});

test.afterAll(async () => {
  if (createdGameId) {
    const mod = await import("../helpers/db");
    await mod.deleteGame(createdGameId);
    createdGameId = null;
  }
});

async function signIn(page: Parameters<typeof loginAs>[0]): Promise<void> {
  await loginAs(page, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD);
}

test.describe("mentor admin UI", () => {
  test("game detail renders current state controls and config", async ({ page }) => {
    await signIn(page);
    await page.goto(`/mentor/games/${gameId}`);
    await page.waitForURL(`**/mentor/games/${gameId}`);

    // Seeded game is ACTIVE (global-setup guarantees it), so the state panel
    // must show the eliminate action rather than start.
    await expect(page.getByRole("button", { name: /Eliminate Bottom/i })).toBeVisible();

    // Configuration panel reflects the live values.
    const configPanel = page.locator("div.bg-surface-container", {
      hasText: "Configuration",
    });
    await expect(configPanel.getByText("Max Rounds")).toBeVisible();
    await expect(configPanel.getByText("3", { exact: true })).toBeVisible();
    await expect(configPanel.getByText("30min")).toBeVisible();
  });

  test("full state machine drives through START → ELIMINATE → FINISH → RESET", async ({
    page,
  }) => {
    await signIn(page);

    // Provision an isolated game so the sequence never touches the shared game.
    createdGameId = (await createQaGame(`QA-Browser-Mentor-${Date.now()}`)).id;

    await page.goto(`/mentor/games/${createdGameId}`);
    await page.waitForURL(`**/mentor/games/${createdGameId}`);

    // PENDING -> Start Game appears.
    await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
    await page.getByRole("button", { name: "Start Game" }).click();
    await expect(page.getByRole("button", { name: /Eliminate Bottom/i })).toBeVisible();
    await expect(page.getByText("ACTIVE").first()).toBeVisible();

    // ACTIVE -> Eliminate -> ELIMINATING reveals next-round + declare-winner.
    await page.getByRole("button", { name: /Eliminate Bottom/i }).click();
    await expect(page.getByRole("button", { name: "Start Next Round" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Declare Winner" })).toBeVisible();

    // ELIMINATING -> Finish -> FINISHED reveals Reset.
    await page.getByRole("button", { name: "Declare Winner" }).click();
    await expect(page.getByRole("button", { name: "Reset Game" })).toBeVisible();

    // FINISHED -> Reset -> PENDING reveals Start Game again.
    await page.getByRole("button", { name: "Reset Game" }).click();
    await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  });

  test("dashboard hero streams the live leaderboard over SSE", async ({ page }) => {
    await signIn(page);
    await page.goto("/mentor/dashboard");
    await page.waitForURL("**/mentor/dashboard");

    await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();

    // The seeded game is ACTIVE, so the hero panel subscribes to the leaderboard
    // SSE. Once connected its subtitle reads "Live Leaderboard".
    await expect(page.getByText("Live Leaderboard")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Manage Hunt" })).toBeVisible();
  });

  test("generate QR codes for a game produces one render per index", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/mentor/indexes");
    await page.waitForURL("**/mentor/indexes");

    // Expected index count for the seeded active game.
    const indexes = await getIndexesForGame(gameId);

    // Select the seeded game by its stable id so batch QR is enabled. The
    // filter <select> is the first select on the page (the create-form select
    // only appears after opening the form).
    await page.locator("select").first().selectOption(gameId);

    await page.getByRole("button", { name: "Generate QR Codes" }).click();
    const qrBlock = page.locator("div.bg-surface-container", {
      hasText: "Generated QR Codes",
    });
    const qrImgs = qrBlock.locator("img");
    await expect(qrImgs.first()).toBeVisible({ timeout: 15000 });
    await expect(qrImgs).toHaveCount(indexes.length);
  });

  test("newly created index gets a QR code without a round selection", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/mentor/indexes");
    await page.waitForURL("**/mentor/indexes");

    // Open the create form and fill it, leaving round unset. The mentor UI
    // submits game_id + label + points; the server must attach the game's
    // active round so the index is immediately QR-ready.
    const label = `QA Fresh Index ${Date.now()}`;
    await page.getByRole("button", { name: "New Index" }).click();
    await page.locator("form div select").first().selectOption(gameId);
    await page.getByPlaceholder("Smiling Rock").fill(label);
    await page.getByRole("button", { name: "Create Index" }).click();
    await expect(page.getByText(label)).toBeVisible();

    // The "QR" action on the fresh row opens a modal with a generated code.
    const row = page.locator("div.bg-surface-container", { hasText: label });
    await row.getByRole("button", { name: "QR" }).click();
    const modal = page.locator("div.fixed");
    await expect(modal.getByText(label)).toBeVisible();
    await expect(modal.getByRole("img", { name: label })).toBeVisible({ timeout: 15000 });
    await expect(modal.getByText(/Scan this code with the player app\./)).toBeVisible();
  });

  test("team detail page shows the scan ledger with the scanning player named", async ({
    page,
    browser,
  }) => {
    await signIn(page);

    // A player account claims a marker so there is a scan to inspect. The scan
    // is attributed to the team; the mentor ledger must name the scanning player.
    const playerName = `qa_ledger_run_${Date.now().toString(36)}`;
    const teamName = `QA-Ledger-${Date.now()}`;
    const playerCtx = await browser.newContext();
    let teamId = "";
    let indexLabel = "";
    try {
      const playerPage = await playerCtx.newPage();
      await createUser(playerName, PLAYER_PW);
      await loginAs(playerPage, playerName, PLAYER_PW);

      const created = await api<{ success: boolean; data?: { id: string } }>(
        playerPage,
        "/api/v1/players/me/team",
        { method: "POST", body: { team_name: teamName } }
      );
      expect(created.json.success).toBe(true);
      teamId = created.json?.data?.id ?? "";

      const step1 = (await getIndexesForGame(gameId)).find(
        (i) => i.sequence_order === 1
      );
      if (!step1) throw new Error("no sequence step 1 for the ledger test");
      indexLabel = step1.label;
      const qr = await getQrCodeForIndex(step1.id);
      const scan = await api<{ success: boolean }>(
        playerPage,
        `/api/v1/games/${gameId}/scan`,
        {
          method: "POST",
          body: {
            qr_data: encodeQrPayload(createQrPayload(step1.id, gameId, qr.id)),
          },
        }
      );
      expect(scan.json.success).toBe(true);
    } finally {
      await playerCtx.close();
    }

    expect(teamId).not.toBe("");

    // Mentor view: navigate to the team's scan ledger and see the scan + player.
    await page.goto(`/mentor/teams/${teamId}`);
    await expect(page.getByRole("heading", { name: /Scan Ledger/ })).toBeVisible();
    await expect(page.getByText(indexLabel).first()).toBeVisible();
    await expect(page.getByText(playerName).first()).toBeVisible();

    // Clean up the QA team + player so no orphan rows survive the run.
    const cleanCtx = await browser.newContext();
    try {
      const c = await cleanCtx.newPage();
      await loginAs(c, playerName, PLAYER_PW);
      await api(c, "/api/v1/players/me/team", { method: "DELETE" });
    } finally {
      await cleanCtx.close();
    }
    await cleanupUsers([playerName]);
  });
});
