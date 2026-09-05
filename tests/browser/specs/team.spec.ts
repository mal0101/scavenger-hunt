import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs, api } from "../helpers/auth";
import { createUser } from "../helpers/db";

const SUF = Date.now().toString(36);
const PW = "TestPass_2026!";
const CAPTAIN = `qa_team_cap_${SUF}`;
const SOLO = `qa_team_solo_${SUF}`;
let createdUsernames: string[] = [];

test.afterAll(async () => {
  if (createdUsernames.length === 0) return;
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdUsernames);
  createdUsernames = [];
});

test.describe("player team page", () => {
  test("captain sees crew, invite code, and captain controls", async ({ page }) => {
    await createUser(CAPTAIN, PW);
    createdUsernames.push(CAPTAIN);
    await loginAs(page, CAPTAIN, PW);

    const res = await api<{
      success: boolean;
      data?: { id: string; invite_code: string };
    }>(page, "/api/v1/players/me/team", {
      method: "POST",
      body: { team_name: `QA-Browser-Team-${SUF}` },
    });
    expect(res.json?.success).toBe(true);

    const inviteCode = res.json?.data?.invite_code as string;

    await page.goto("/team");
    await expect(page.getByText("Your Crew")).toBeVisible();
    await expect(page.getByText(inviteCode)).toBeVisible();
    await expect(page.getByText("Captain Controls")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Crewmates" })
    ).toBeVisible();

    // Creator is listed as the captain on the detail payload.
    const me = await api<{ success: boolean; data?: { id: string } }>(
      page,
      "/api/v1/players/me"
    );
    const myPlayerId = me.json?.data?.id as string;

    const detail = await api<{
      success: boolean;
      data: { team: { captain_id: string; is_captain: boolean; members: Array<{ is_captain: boolean; is_me: boolean }> } | null };
    }>(page, "/api/v1/players/me/team");
    const team = detail.json?.data?.team;
    expect(detail.json?.success).toBe(true);
    expect(team?.is_captain).toBe(true);
    expect(team?.captain_id).toBe(myPlayerId);
    const captainMember = team?.members.find((m) => m.is_captain);
    expect(captainMember?.is_me).toBe(true);

    // Clean up the QA team so global-setup finds no stale QA-Browser-* rows.
    await api(page, "/api/v1/players/me/team", { method: "DELETE" });
  });

  test("team-less player sees the join prompt", async ({ page }) => {
    await createUser(SOLO, PW);
    createdUsernames.push(SOLO);
    await loginAs(page, SOLO, PW);

    await page.goto("/team");
    await expect(page.getByRole("heading", { name: "Your Crew" })).toBeVisible();
    await expect(page.getByText("You are not part of a team yet.")).toBeVisible();

    // M5: the team-less page offers inline team creation — a player can start
    // their own crew without leaving the page.
    await page.locator("#team-name").fill(`QA-UI-Crew-${SUF}`);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Crewmates" })).toBeVisible();
    await expect(page.getByText("Captain Controls")).toBeVisible();
    await expect(page.getByText(/[A-Z0-9]{6}/)).toBeVisible();

    // Clean up: sole captain leaves (disbands).
    await api(page, "/api/v1/players/me/team", { method: "DELETE" });
  });

  test("team-less player joins a crew via invite code", async ({ page }) => {
    const host = `qa_team_host_${SUF}`;
    await createUser(host, PW);
    createdUsernames.push(host);
    const hostPage = await page.context().newPage();
    await loginAs(hostPage, host, PW);

    const res = await api<{ success: boolean; data?: { invite_code: string } }>(
      hostPage,
      "/api/v1/players/me/team",
      { method: "POST", body: { team_name: `QA-Host-Crew-${SUF}` } }
    );
    expect(res.json?.success).toBe(true);
    const code = res.json?.data?.invite_code as string;

    const solo2 = `qa_team_solo2_${SUF}`;
    await createUser(solo2, PW);
    createdUsernames.push(solo2);
    await loginAs(page, solo2, PW);

    await page.goto("/team");
    await expect(page.getByText("You are not part of a team yet.")).toBeVisible();
    await page.locator("#invite-code").fill(code);
    await page.getByRole("button", { name: "Join", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Crewmates" })).toBeVisible();
    await expect(page.getByText(/[A-Z0-9]{6}/)).toBeVisible();

    // Clean up in dependency order: teammate leaves before the host disbands.
    await api(page, "/api/v1/players/me/team", { method: "DELETE" });
    await api(hostPage, "/api/v1/players/me/team", { method: "DELETE" });
    await hostPage.close();
  });

  test("team-less player hitting /dock is redirected to /team", async ({ page }) => {
    const orphan = `qa_team_orphan_${SUF}`;
    await createUser(orphan, PW);
    createdUsernames.push(orphan);
    await loginAs(page, orphan, PW);

    await page.goto("/dock");
    await page.waitForURL("**/team");
    await expect(page.getByText("You are not part of a team yet.")).toBeVisible();

    // After creating a crew, the same player can reach the dock normally.
    await page.locator("#team-name").fill(`QA-Orphan-Crew-${SUF}`);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Crewmates" })).toBeVisible();
    await page.goto("/dock");
    await expect(page.getByText("Quick Actions")).toBeVisible();

    await api(page, "/api/v1/players/me/team", { method: "DELETE" });
  });
});