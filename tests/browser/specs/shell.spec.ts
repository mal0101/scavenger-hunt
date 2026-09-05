import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs } from "../helpers/auth";
import { createUser } from "../helpers/db";

const SUF = Date.now().toString(36);
const P1 = `qa_shell_${SUF}`;
const PW = "TestPass_2026!";
let createdUsernames: string[] = [P1];

test.beforeAll(async () => {
  await createUser(P1, PW);
});

test.afterAll(async () => {
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdUsernames);
  createdUsernames = [];
});

test.describe("player shell pages", () => {
  test("all player pages render without errors while authenticated", async ({ page }) => {
    await loginAs(page, P1, PW);

    const pages = [
      { path: "/dock", heading: "Current Objective" },
      { path: "/scan", heading: "Ready to Scan" },
      { path: "/leaderboard", heading: "Live Leaderboard" },
      { path: "/vault", heading: null },
      { path: "/logs", heading: null },
      { path: "/enigma", heading: null },
      { path: "/trap", heading: null },
      { path: "/scan-result", heading: null },
      { path: "/team", heading: "Your Crew" },
    ];

    for (const p of pages) {
      const res = await page.goto(p.path);
      expect(res?.status(), `HTTP status for ${p.path}`).toBeLessThan(400);
      if (p.heading) {
        await expect(page.getByText(p.heading).first(), `heading on ${p.path}`).toBeVisible();
      } else {
        await page.waitForLoadState("networkidle").catch(() => {});
        const body = await page.locator("body").innerText();
        expect(body.trim().length, `${p.path} produced a blank page`).toBeGreaterThan(0);
      }
    }
  });
});