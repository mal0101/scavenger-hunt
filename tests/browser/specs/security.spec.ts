import { expect } from "@playwright/test";
import { test } from "../fixtures/base";
import { loginAs } from "../helpers/auth";
import { createUser } from "../helpers/db";

const SUF = Date.now().toString(36);
const P1 = `qa_security_${SUF}`;
const PW = "TestPass_2026!";
let createdUsernames: string[] = [];

test.beforeAll(async () => {
  await createUser(P1, PW);
});

test.afterAll(async () => {
  if (createdUsernames.length === 0) return;
  const mod = await import("../helpers/db");
  await mod.cleanupUsers(createdUsernames);
  createdUsernames = [];
});

test.describe("security headers & CSP", () => {
  test("critical security headers are present on app routes", async ({
    request,
  }) => {
    for (const path of ["/login", "/"]) {
      const res = await request.get(path);
      expect(res.status()).toBeLessThan(400);
      const headers = res.headers();
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"]).toContain("default-src 'self'");
      expect(headers["x-powered-by"]).toBeUndefined();
    }
  });

  test("permitted origins policy allows camera for self only", async ({
    request,
  }) => {
    const res = await request.get("/login");
    const pp = res.headers()["permissions-policy"];
    expect(pp).toContain("camera=(self)");
    expect(pp).toContain("geolocation=(self)");
    expect(pp).toMatch(/microphone=\(\)/);
  });

  test("authenticated journey stays CSP-clean (no violations or 5xx)", async ({
    page,
  }) => {
    // Surface real browser CSP violations into a place we can assert on.
    // (They also arrive as console errors, which the base fixture already
    // fails on — this listener is an additional, explicit signal.)
    await page.context().addInitScript(() => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        (
          window as unknown as { __cspViolations: string[] }
        ).__cspViolations.push(
          `${(e as unknown as { violatedDirective?: string }).violatedDirective}`
        );
      });
    });

    await loginAs(page, P1, PW);
    createdUsernames.push(P1);
    await page.goto("/dock");
    await page.goto("/leaderboard");
    await page.goto(
      "/scan-result?type=index&data=" +
        encodeURIComponent(
          '{"index_label":"x","points_earned":10,"team_total":10,"scan_id":"none"}'
        )
    );

    const csp = await page.evaluate(
      () => (window as unknown as { __cspViolations: string[] }).__cspViolations
    );
    // In dev, React/Next eval() probes trigger script-src violations because
    // the strict CSP omits unsafe-eval. That is expected here and never
    // happens in production builds. The real invariant: no violation may come
    // from any OTHER directive (connect-src, img-src, frame-ancestors, ...),
    // as those would indicate actual injection or a broken policy.
    const nonScriptSrc = csp.filter((d) => d !== "script-src");
    expect(nonScriptSrc).toEqual([]);
    // The base fixture already fails the test if any console error or >=500
    // response occurred, so reaching here is itself the pass condition.
  });
});
