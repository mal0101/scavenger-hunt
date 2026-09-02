import { expect } from "@playwright/test";
import { test } from "../fixtures/base";

/**
 * PWA service-worker coverage. SW registration is gated to production builds
 * (see components/providers.tsx), so this spec registers /sw.js manually
 * against the dev server to exercise the same worker script.
 */
test.describe("service worker / PWA", () => {
  test("serves the service worker script and registers cleanly", async ({
    page,
    request,
  }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] || "").toContain("javascript");

    await page.goto("/login");
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register("/sw.js");
      // skipWaiting() in the worker means it should activate promptly; race a
      // wait for a controlling client so subsequent navigation is intercepted.
      await new Promise<void>((resolve) => {
        if (navigator.serviceWorker.controller) {
          resolve();
          return;
        }
        navigator.serviceWorker.addEventListener("controllerchange", () =>
          resolve(),
          { once: true }
        );
        // Refresh once to let skipWaiting + clients.claim take control.
        window.location.reload();
        // Mark warm-up as not an error path: the reload will re-enter.
        setTimeout(resolve, 2000);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__swRegForTest = reg;
    });
  });

  test("static assets are cached by the worker", async ({ page }) => {
    await page.goto("/login");
    // Register + force control.
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(500);
    // Reload so the worker controls the page, then load a static asset through
    // it so the fetch handler caches it.
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, {
      timeout: 10000,
    });

    // Ask the worker (via a client-side message) whether a static asset the
    // page already fetched is present in the static cache.
    const cached = await page.evaluate(async () => {
      const keys = await (window as unknown as { caches: CacheStorage }).caches.keys();
      const staticCache = await (window as unknown as { caches: CacheStorage }).caches.open(
        keys.find((k) => k.startsWith("aether-static"))
          ?? "aether-static-v1"
      );
      const reqs = await staticCache.keys();
      const urls = reqs.map((r) => new URL(r.url).pathname);
      return { urls, hasNextStatic: urls.some((u) => u.startsWith("/_next/static")) };
    });
    expect(cached.hasNextStatic).toBe(true);
  });

  test("offline navigation is served from the navigation cache", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.evaluate(() => navigator.serviceWorker.register("/sw.js"));
    // Navigate online once so the network-first handler caches the /login nav.
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, {
      timeout: 10000,
    });
    await page.goto("/login");

    // Go offline and try a navigation that must now come from NAV_CACHE.
    await context.setOffline(true);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // The page still rendered (from cache) rather than showing a network error.
    await expect(page.locator("body")).not.toBeEmpty();
    await context.setOffline(false);
  });
});
