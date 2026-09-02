import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api } from "../helpers/auth";

const P1 = "+212699910001";
const P2 = "+212699910002";
const MENTOR = "+212600000001";

let createdPhones: string[] = [];

async function deleteTestUsers(): Promise<void> {
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdPhones);
  createdPhones = [];
}

function loginRedirectUrl(target: string): (url: URL) => boolean {
  return (url: URL) =>
    url.pathname === "/login" && url.searchParams.get("redirect") === target;
}

test.afterAll(async () => {
  await deleteTestUsers();
});

test.describe("auth guards", () => {
  test("unauthenticated navigation bounces to /login with redirect", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(loginRedirectUrl("/"));
    expect(page.url()).toContain("/login");

    await page.goto("/dock");
    await page.waitForURL(loginRedirectUrl("/dock"));

    await page.goto("/mentor/dashboard");
    await page.waitForURL(loginRedirectUrl("/mentor/dashboard"));
  });

  test("public pages load without auth", async ({ page }) => {
    for (const p of ["/login", "/verify?phone=%2B212699910001", "/role-select"]) {
      const res = await page.goto(p);
      expect(res?.status()).toBeLessThan(400);
    }
  });
});

test.describe("player sign-in", () => {
  test("full login flow from the UI forms", async ({ page }) => {
    // 1. Invalid phone shows inline error, stays put.
    await page.goto("/login");
    await page.getByLabel("Phone Number").fill("abc");
    await page.getByRole("button", { name: "Send Verification Code" }).click();
    await expect(page.getByText("Enter a valid phone number")).toBeVisible();
    expect(page.url()).toContain("/login");

    // 2. Valid phone proceeds to verification.
    await page.getByLabel("Phone Number").fill(P1);
    await page.getByRole("button", { name: "Send Verification Code" }).click();
    await page.waitForURL("**/verify?phone=*");
    createdPhones.push(P1);

    // 3. Wrong code shows an error.
    await page.locator('input[aria-label^="OTP digit"]').nth(0).fill("1");
    await page.locator('input[aria-label^="OTP digit"]').nth(1).fill("1");
    await page.locator('input[aria-label^="OTP digit"]').nth(2).fill("1");
    await page.locator('input[aria-label^="OTP digit"]').nth(3).fill("1");
    await page.locator('input[aria-label^="OTP digit"]').nth(4).fill("1");
    await page.locator('input[aria-label^="OTP digit"]').nth(5).fill("1");
    await page.getByRole("button", { name: "Verify Code" }).click();
    await expect(page.getByText("Invalid or expired OTP code")).toBeVisible();

    // 4. Resend, then correct code lands on /dock as PLAYER.
    await page.getByRole("button", { name: "Resend Code" }).click();
    await page.locator('input[aria-label^="OTP digit"]').nth(0).fill("0");
    await page.locator('input[aria-label^="OTP digit"]').nth(1).fill("0");
    await page.locator('input[aria-label^="OTP digit"]').nth(2).fill("0");
    await page.locator('input[aria-label^="OTP digit"]').nth(3).fill("0");
    await page.locator('input[aria-label^="OTP digit"]').nth(4).fill("0");
    await page.locator('input[aria-label^="OTP digit"]').nth(5).fill("0");
    await page.getByRole("button", { name: "Verify Code" }).click();
    await page.waitForURL("**/dock");

    const cookies = await page.context().cookies();
    const names = cookies.map((c) => c.name);
    expect(names).toContain("access_token");
    expect(names).toContain("refresh_token");
  });

  test("verified player persisted and dashboard displays profile", async ({ page }) => {
    await loginAs(page, P2);
    createdPhones.push(P2);
    await page.goto("/dock");
    await expect(page.getByText("Your Status")).toBeVisible();
    await expect(page.getByText("No team")).toBeVisible();

    // Player profile endpoint agrees.
    const me = await api<{ success: boolean; data: { nickname: string | null; team: null } }>(
      page,
      "/api/v1/players/me"
    );
    expect(me.status).toBe(200);
    expect(me.json.success).toBe(true);
  });
});

test.describe("mentor sign-in", () => {
  test("mentor role routing", async ({ page }) => {
    await loginAs(page, MENTOR);
    await page.goto("/mentor/dashboard");
    await page.waitForURL("**/mentor/dashboard");

    // Mentor hitting a player route bounces back to dashboard.
    await page.goto("/dock");
    await page.waitForURL("**/mentor/dashboard");
  });

  test("player cannot reach mentor area", async ({ page }) => {
    await loginAs(page, P1);
    createdPhones.push(P1);
    await page.goto("/mentor/games");
    await page.waitForURL("**/dock");

    const res = await api<{ error?: string }>(page, "/api/v1/admin/runtime");
    expect(res.json.error).toBe("FORBIDDEN");
  });
});

test.describe("logout", () => {
  test("logging out clears session and re-guards protected pages", async ({ page }) => {
    await loginAs(page, P1);
    createdPhones.push(P1);
    await page.goto("/dock");

    const logout = page.getByRole("button", { name: /sign ?out/i });
    await expect(logout).toBeVisible();
    await logout.click();

    await page.waitForURL("**/login");
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === "access_token" && c.value)).toBe(false);

    await page.goto("/dock");
    await page.waitForURL(loginRedirectUrl("/dock"));
  });
});