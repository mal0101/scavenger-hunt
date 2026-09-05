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
    await expect(page.getByText("Your Crew")).toBeVisible();
    await expect(page.getByText("You are not part of a team yet.")).toBeVisible();
  });
});