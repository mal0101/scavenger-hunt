import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD } from "../helpers/auth";
import { createUser } from "../helpers/db";

const SUF = Date.now().toString(36);
const P1 = `qa_auth_p1_${SUF}`;
const P2 = `qa_auth_p2_${SUF}`;
const PW = "TestPass_2026!";

let createdUsernames: string[] = [];

async function authPlayer(page: Parameters<typeof loginAs>[0], username: string): Promise<void> {
  await createUser(username, PW);
  await loginAs(page, username, PW);
  createdUsernames.push(username);
}

async function deleteTestUsers(): Promise<void> {
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdUsernames);
  createdUsernames = [];
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
    for (const p of ["/login", "/role-select"]) {
      const res = await page.goto(p);
      expect(res?.status()).toBeLessThan(400);
    }
  });
});

test.describe("player sign-in", () => {
  test("full login flow from the UI forms", async ({ page }) => {
    // 1. Too-short username shows a client-side error, stays put.
    await page.goto("/login");
    await page.getByLabel("Username").fill("ab");
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Username must be at least 3 characters.")).toBeVisible();
    expect(page.url()).toContain("/login");

    // 2. Valid format but unknown account shows the server error.
    await page.getByLabel("Username").fill(`no_such_user_${SUF}`);
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid username or password")).toBeVisible();
    expect(page.url()).toContain("/login");

    // 3. Correct credentials land on /dock as PLAYER.
    await createUser(P1, PW);
    createdUsernames.push(P1);
    await page.getByLabel("Username").fill(P1);
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/dock");

    const cookies = await page.context().cookies();
    const names = cookies.map((c) => c.name);
    expect(names).toContain("access_token");
    expect(names).toContain("refresh_token");
  });

  test("authenticated player dashboard displays profile", async ({ page }) => {
    await authPlayer(page, P2);
    await page.goto("/dock");
    await expect(page.getByText("Your Status")).toBeVisible();
    await expect(page.getByText("No team")).toBeVisible();

    const me = await api<{ success: boolean; data: { username: string | null; team: null } }>(
      page,
      "/api/v1/players/me"
    );
    expect(me.status).toBe(200);
    expect(me.json.success).toBe(true);
    expect(me.json.data.username).toBe(P2);
  });
});

test.describe("mentor sign-in", () => {
  test("mentor role routing", async ({ page }) => {
    await loginAs(page, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD);
    await page.goto("/mentor/dashboard");
    await page.waitForURL("**/mentor/dashboard");

    // Mentor hitting a player route bounces back to dashboard.
    await page.goto("/dock");
    await page.waitForURL("**/mentor/dashboard");
  });

  test("player cannot reach mentor area", async ({ page }) => {
    await authPlayer(page, P1);
    await page.goto("/mentor/games");
    await page.waitForURL("**/dock");

    const res = await api<{ error?: string }>(page, "/api/v1/admin/runtime");
    expect(res.json.error).toBe("FORBIDDEN");
  });
});

test.describe("logout", () => {
  test("logging out clears session and re-guards protected pages", async ({ page }) => {
    await authPlayer(page, P1);
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