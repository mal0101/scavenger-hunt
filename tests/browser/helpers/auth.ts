import type { Page } from "@playwright/test";

export const MOCK_CODE = "000000";

/**
 * Calls the auth API through the page's own request context, so the resulting
 * session cookies land in the browser context and subsequent page navigations
 * are authenticated.
 */
export async function loginAs(
  page: Page,
  phoneNumber: string,
  code = MOCK_CODE
): Promise<boolean> {
  const otp = await page.request.post("/api/v1/auth/send-otp", {
    data: { phone_number: phoneNumber },
  });
  if (!otp.ok()) return false;

  const verify = await page.request.post("/api/v1/auth/verify-otp", {
    data: { phone_number: phoneNumber, code },
  });
  if (!verify.ok()) return false;
  const body = (await verify.json()) as {
    success: boolean;
    data?: { user?: { role?: string } };
  };
  return body.success === true;
}

export async function requestOtp(
  page: Page,
  phoneNumber: string
): Promise<boolean> {
  const res = await page.request.post("/api/v1/auth/send-otp", {
    data: { phone_number: phoneNumber },
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