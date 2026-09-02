import { test as base, type Page } from "@playwright/test";

export interface CollectedIssues {
  pageErrors: Error[];
  consoleErrors: { type: string; text: string }[];
  requestFailures: { url: string; error: string }[];
  httpErrors: { url: string; status: number }[];
}

const CONSOLE_ALLOWLIST: RegExp[] = [
  // Next.js dev overlay / HMR chatter is not application noise.
  /\[HMR\]/,
  /Download the React DevTools/,
  /manifest\.json/,
  /favicon/,
  // React's dev-mode eval() probe. The app's strict CSP omits unsafe-eval,
  // so React logs this "warning" in every browser load; it is expected and
  // does not indicate a defect (production builds never hit it).
  /eval\(\) is not supported in this environment.*unsafe-eval/,
  // Corresponding CSP refusal the browser emits for that same dev eval()
  // probe. Expected in dev only, so it is not treated as a console error.
  /Refused to evaluate a string as JavaScript.*unsafe-eval/,
];

export const test = base.extend<{
  collected: CollectedIssues;
  /** Attach console/page/network collectors to any page the test creates. */
  collect: (page: Page) => void;
}>({
  collected: async ({ page }, resolveFixture) => {
    const issues: CollectedIssues = {
      pageErrors: [],
      consoleErrors: [],
      requestFailures: [],
      httpErrors: [],
    };
    collectFromPage(page, issues);
    await resolveFixture(issues);
    expectNoIssues(issues);
  },
  // Shares the same buffer as `collected`, so errors observed on extra pages
  // (e.g. second browser contexts in SSE tests) also fail the test.
  collect: async ({ collected }, resolveFixture) => {
    await resolveFixture((page: Page) => collectFromPage(page, collected));
  },
});

/** Attach browser-side collectors to a page (auto-called for the main page). */
export function collectFromPage(page: Page, issues: CollectedIssues): void {
  page.on("pageerror", (err) => {
    issues.pageErrors.push(err);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      issues.consoleErrors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    // SSE reconnects and abort/cancel during page teardown are expected.
    if (url.includes("/api/v1/sse/")) return;
    if (req.failure()?.errorText === "net::ERR_ABORTED") return;
    issues.requestFailures.push({ url, error: req.failure()?.errorText ?? "failed" });
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      issues.httpErrors.push({ url: res.url(), status: res.status() });
    }
  });
}

function expectNoIssues(issues: CollectedIssues): void {
  if (issues.pageErrors.length > 0) {
    throw new Error(
      `Uncaught page errors (${issues.pageErrors.length}):\n` +
        issues.pageErrors.map((e) => `  - ${e.message}`).join("\n")
    );
  }
  const badConsole = issues.consoleErrors.filter(
    (m) => !CONSOLE_ALLOWLIST.some((r) => r.test(m.text))
  );
  if (badConsole.length > 0) {
    throw new Error(
      `Console errors (${badConsole.length}):\n` +
        badConsole.map((m) => `  - ${m.text}`).join("\n")
    );
  }
  if (issues.httpErrors.length > 0) {
    throw new Error(
      `HTTP >=500 (${issues.httpErrors.length}):\n` +
        issues.httpErrors.map((h) => `  ${h.status} ${h.url}`).join("\n")
    );
  }
  if (issues.requestFailures.length > 0) {
    throw new Error(
      `Request failures (${issues.requestFailures.length}):\n` +
        issues.requestFailures.map((r) => `  - ${r.error} ${r.url}`).join("\n")
    );
  }
}