import type { Page } from "@playwright/test";

export const SEED_ADMIN_USERNAME = "mentor";
export const SEED_ADMIN_PASSWORD =
  process.env.CREDENTIALS_SEED_ADMIN_PASSWORD ?? "ChangeMe_Admin_2026!";
export const SEED_PLAYER_PASSWORD =
  process.env.CREDENTIALS_SEED_PLAYER_PASSWORD ?? "DevPass_2026!";

/**
 * Signs in through the credentials API using the page's own request context, so
 * the resulting session cookies land in the browser context and subsequent page
 * navigations are authenticated. A fresh account is created via the mentor
 * endpoint when `provision` is true, so each spec gets an isolated player.
 */
export async function loginAs(
  page: Page,
  username: string,
  password: string,
  options: { provision?: boolean } = {}
): Promise<boolean> {
  if (options.provision === true) {
    await provisionUser(page, username, password);
  }
  const res = await page.request.post("/api/v1/auth/login", {
    data: { username, password },
  });
  if (!res.ok()) return false;
  const body = (await res.json()) as {
    success: boolean;
    data?: { user?: { role?: string } };
  };
  return body.success === true;
}

/**
 * Creates a PLAYER account through the admin endpoint. Requires the caller's
 * session to already be a MENTOR (e.g. an admin helper invoked first).
 */
export async function provisionUser(
  page: Page,
  username: string,
  password: string,
  role: "PLAYER" | "MENTOR" = "PLAYER"
): Promise<boolean> {
  const res = await page.request.post("/api/v1/admin/users", {
    data: { username, password, role },
  });
  return res.ok();
}

/** Raw API wrapper that resolves JSON and does not throw on error statuses. */
export async function api<T = unknown>(
  page: Page,
  url: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; json: T }> {
  const res = await page.request.fetch(url, {
    method: options.method ?? "GET",
    data: options.body,
  });
  let json: T;
  try {
    json = (await res.json()) as T;
  } catch {
    json = null as never;
  }
  return { status: res.status(), json };
}