import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD } from "../helpers/auth";
import {
  createQaGame,
  getActiveGame,
  getRoundForGame,
  getIndexesForGame,
} from "../helpers/db";

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
    const indexes = await getIndexesForGame(
      gameId,
      (await getRoundForGame(gameId, (await getActiveGame()).current_round)).id
    );

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
});
