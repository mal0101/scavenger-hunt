import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs } from "../helpers/auth";

const P1 = "+212699910005";
let createdPhones: string[] = [];

test.afterAll(async () => {
  if (createdPhones.length === 0) return;
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdPhones);
  createdPhones = [];
});

test.describe("player shell pages", () => {
  test("all player pages render without errors while authenticated", async ({ page }) => {
    await loginAs(page, P1);
    createdPhones.push(P1);

    const pages = [
      { path: "/dock", heading: "Current Objective" },
      { path: "/scan", heading: "Ready to Scan" },
      { path: "/leaderboard", heading: "Live Leaderboard" },
      { path: "/vault", heading: null },
      { path: "/logs", heading: null },
      { path: "/enigma", heading: null },
      { path: "/trap", heading: null },
      { path: "/scan-result", heading: null },
    ];

    for (const p of pages) {
      const res = await page.goto(p.path);
      expect(res?.status(), `HTTP status for ${p.path}`).toBeLessThan(400);
      if (p.heading) {
        await expect(page.getByText(p.heading).first(), `heading on ${p.path}`).toBeVisible();
      } else {
        // Page body must not be blank.
        await page.waitForLoadState("networkidle").catch(() => {});
        const body = await page.locator("body").innerText();
        expect(body.trim().length, `${p.path} produced a blank page`).toBeGreaterThan(0);
      }
    }
  });
});