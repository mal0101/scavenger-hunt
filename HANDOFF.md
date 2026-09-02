# Scavenger-Hunt — Handoff: Test Suite Status, Fixes & How to Run Everything

This document is the complete operational handoff for reproducing, understanding, and
extending the test surface (unit, integration, and Playwright browser) of this app.
Every number below was **verified live** on `main` at HEAD `bc02d3c` (this session).

---

## 1. Verified status (the only thing that matters)

| Tier | Command | Result |
|---|---|---|
| Browser (Playwright) | `npm run test:browser` | **31 / 31** |
| Unit | `npm test` | **44 / 44** |
| Integration | `npm run test:integration` (server on 3000, or `BASE_URL=…`) | **79 / 79** |
| TypeScript | `npx tsc --noEmit` | clean (exit 0) |
| Lint | `npm run lint` | 0 errors; 3 pre-existing warnings (see §8) |

There are **no known failing tests** once the prerequisites in §2 are met.

---

## 2. Runtime prerequisites (read this before running anything)

### `.env.local` (at repo root) — required for unit + integration + the app
Key names present (values are local; do not commit):

```
DATABASE_URL  UPSTASH_REDIS_REST_URL  UPSTASH_REDIS_REST_TOKEN
JWT_SECRET  JWT_REFRESH_SECRET  JWT_EXPIRY  JWT_REFRESH_EXPIRY
HMAC_SECRET  OTP_MOCK  TWILIO_SID  TWILIO_AUTH_TOKEN  TWILIO_PHONE
NEXT_PUBLIC_APP_URL  NODE_ENV
```

Critical flags:
- `OTP_MOCK=true` → the code is always `000000`. **All** browser `loginAs` helpers and the
  integration suite use `000000`. In **production** builds, OTP mocking throws — so never
  run these suites against a `next start` build; use `next dev` only.
- `NODE_ENV="development"`.
- `HMAC_SECRET` — the test QR helper mirrors `lib/utils/crypto.ts` (fallback
  `dev_hmac_secret_change_in_production`) and reads this env, so test-signed QR payloads
  match what the app validates. Keep `.env.local`'s `HMAC_SECRET` intact for the suite.

### Two different dev servers (do not mix ports)
- **Browser suite** expects a dev server on **3100**.
- **Integration suite** defaults to **3000**, overridable with `BASE_URL`.

Start the browser-tier server like this (from repo root):
```bash
UPSTASH_REDIS_REST_URL= UPSTASH_REDIS_REST_TOKEN= PORT=3100 && npm run dev
```
(Intentionally blanking the Upstash vars keeps Redis-backed rate-limiting off in dev.)
There is **no `webServer` block** in `playwright.config.ts` — the server is managed
manually. Playwright will just fail with `ECONNREFUSED` if the server is down, so start it
first.

### Seed data the suites depend on
- Seed game `00000000-0000-0000-0000-000000000001` must be **ACTIVE**, `current_round = 1`,
  with **5 indexes** on that round. `tests/browser/global-setup.ts` restores this at the
  start of every browser run (resets status/round, re-points indexes at round 1, deletes
  `+21269991*` QA users and `QA-Browser-*` games).
- Mentor account: `+212600000001`.

### Playwright install
```bash
npx playwright install chromium
```
Needs one-time browser download.

---

## 3. How to run each tier (from repo root)

```bash
# Unit — self-loads .env.local (see the fix in §5 #2)
npm test

# Integration — needs a server on 3000 (start one first), or point at a running one:
BASE_URL=http://localhost:3100 npm run test:integration

# Browser — server must already be live on 3100 (see §2)
npm run test:browser        # headless, both projects
npm run test:browser:headed # headed (great for the real-camera manual check, §6)
```

You can also target a single spec:
```bash
# from tests/browser
npx playwright test scan --project=player-mobile
npx playwright test sse --project=player-mobile
```

---

## 4. What the Playwright browser suite covers (31 tests)

`tests/browser/` is self-contained (own `playwright.config.ts`, `fixtures/`, `helpers/`,
`global-setup.ts`). Two projects run serially (`workers=1`, no parallelism):

- `player-mobile` (Pixel 7, 390×844, touch, camera+geolocation permissions):
  - `auth.spec.ts` — unauthenticated guard/redirect, public pages, full OTP UI flow
    (invalid phone, wrong code, resend → correct code → `/dock`), mentor routing,
    player-can't-reach-mentor, logout clearing session.
  - `shell.spec.ts` — every player page renders while authenticated.
  - `scan.spec.ts` — **full camera pipeline** (synthetic canvas stream → decode →
    verify → score → result page), tampered-QR error banner, camera-denied UX.
  - `sse.spec.ts` — leaderboard fan-out across two sessions with **no reload**; live
    timer countdown ticking.
  - `mentor.spec.ts` (also desktop) — game detail state controls/services config, full
    state machine, batch QR generation.
  - `security.spec.ts` (also desktop) — headers, Permissions-Policy, CSP-clean journey.
  - `pwa.spec.ts` (also desktop) — SW serves/registers, static asset caching, offline nav.
- `mentor-desktop` (Desktop Chrome, 1440×900) — matches `testMatch:
  /(mentor|security|pwa)\.spec\.ts/` (those three run in BOTH projects).

### The error-collector fixture (`fixtures/base.ts`)
Every test fails if any of these occur on a collected page: uncaught page errors, console
`error` messages (outside an allowlist), HTTP responses ≥ 500, or failed requests
(outside SSE-reconnect / `net::ERR_ABORTED`). A `collect(page)` fixture helper attaches the
same collectors to any **extra** page a test creates (e.g. the second context in the SSE
specs), so errors on secondary pages fail the test too. The allowlist covers dev-only noise:
`[HMR]`, React DevTools download hint, `manifest.json`/`favicon`, and the two `unsafe-eval`
messages (React's dev `eval()` probe + the corresponding CSP refusal). **All four are
expected in dev only** — production builds never emit them.

---

## 5. Real bugs found & fixed (this session)

1. **`hooks/use-camera.ts` — camera previewed but never decoded (production bug).**
   `html5QrCode.start()` was being called while `#qr-reader` was `display:none`; the
   user-facing `setScanning(true)` only ran *after* `start()` resolved. With the container
   hidden, html5-qrcode sized its decode canvas / QR region at **0×0**, so `foreverScan`
   computed `videoWidth / 0 = Infinity` ratios and never detected a QR — the viewfinder
   showed a live feed that would never scan. Fix: `setScanning(true)` moved to the very
   top of `startScanning` (before the dynamic import + `start()`); the `catch` still
   reverts to `setScanning(false)`. Proven by the 3/3 `scan.spec.ts` pipeline tests.

2. **`package.json` `"test"` script — unit suite could not run as documented.**
   `"test": "tsx --test tests/unit/*.test.ts"` **omitted `--env-file=.env.local`**, so the
   DB-backed OTP unit tests aborted with `DATABASE_URL is required …`. The integration
   script already had the flag. Fix: `"tsx --env-file=.env.local --test tests/unit/*.test.ts"`.
   Verified: `npm test` → 44/44 with no manual flag.

3. **`tests/browser/specs/sse.spec.ts` — leaderboard score locator (deterministic fail).**
   `teamScore()` used `ancestor::div[contains(@class, 'flex')][1]` on the team name, which
   resolved to the inner `div.flex-1` name column — that column holds `p.font-headline
   .text-sm`, not the score. The score (`p.font-headline.text-lg`) is in the row’s sibling
   `div.text-right`. Fix: scope the row via `div.flex.items-center` with `hasText:
   <unique team name>`, then read the sole `.text-lg` inside it. This was the **only**
   failing browser test; now 31/31.

4. **`tests/browser/fixtures/base.ts` — error collectors missed secondary pages (coverage
   gap).** Only the default `page` was collected; `pageA`/`pageB` in the SSE specs were
   separate contexts with no error collection, so console errors / 5xx there were silent.
   Fix: added a `collect(page)` fixture that routes any page’s collectors into the same
   assertion buffer. SSE specs now attach collectors to both boards.

Minor hygiene:
- `scan.spec.ts:38` stray comment typo cleaned.
- `.gitignore` — kept `test-results/`, `playwright-report/`, `blob-report/`; removed an
  inert `playwright/.cache/` entry (no such dir is created; Playwright’s real browser cache
  lives in `~/.cache/ms-playwright`, outside the repo).

---

## 6. QR camera testing — how it works & the real-camera checkpoint

- Browser tests do **not** need a physical camera. `helpers/camera.ts` injects a synthetic
  canvas stream (via `getUserMedia` override + `addInitScript`) that paints the **real
  signed QR** payload on every frame at 640×480; html5-qrcode decodes it exactly as it
  would a printed code.
- The QR is drawn **300×300 centered** on the 640×480 video so it sits fully inside the
  decoder’s sampled ~448×336 crop (html5-qrcode centers `qrbox = min(client) * 0.7` scaled
  to the video) — every finder pattern stays visible.
- QR helper (`helpers/qr.ts`) mirrors `lib/qr/generator.ts` + `lib/utils/crypto.ts`:
  same payload shape, same `base64url` encoding, same HMAC payload
  `${indexId}:${gameId}:${roundId}:${timestamp}`, same secret source. Data-URL QR images
  avoid canvas tainting (`SecurityError: Canvas is not origin-clean` with cross-origin URLs).
- **Manual real-camera checkpoint (optional):** run `npm run test:browser:headed`, open
  `/scan` on a device/emulator with a camera, point at a printed scan QR from the mentor
  “Generate QR Codes” flow, and confirm decode → result page. The automation proves the
  pipeline; this is the only human step left.
- html5-qrcode v2.3.8 decodes only from a live `<video>`; `scanFileV2` exists but is not
  wired into the UI, so don’t add UI that depends on canvas-image decoding.

---

## 7. Data-model / state-machine notes (mentor, scan, SSE)

- Valid mentor transitions: `PENDING→ACTIVE (start)`, `ACTIVE→ELIMINATING (eliminate)`,
  `ELIMINATING→ACTIVE (next_round) / FINISHED (finish)`, `FINISHED→PENDING (reset)`.
  `game_id × round_number` is **unique** — do not pre-create a round that the `start`
  action will recreate. The browser suite creates an isolated `QA-…` PENDING game with a
  **roundless** index for the state-machine test, then deletes it in `afterAll`.
- Scan scoring uses `calculateScanScore`; tests assert `points_earned > 0`, **never exact**
  equality. A tampered QR yields message `"QR code invalid: QR_SIGNATURE_INVALID"`.
- `/scan-result?type=*&data=*` carries JSON `{ index_label, points_earned, team_total,
  scan_id }`; the specs parse `data` from the URL.
- Leaderboard row structure (for locators): each team is `div.flex.items-center` (row) →
  `div.flex-1` (name) + `div.text-right` (score `p.font-headline.text-lg` + `pts`).

---

## 8. Known non-issues (leave them alone)

- `tsc --noEmit` clean.
- Lint: 0 errors, **3 pre-existing warnings** (not from browser code, don’t “fix” casually):
  - `app/layout.tsx:41,45` `@next/next/no-page-custom-font` (custom fonts in `<head>`).
  - `lib/api-client.ts:57` `@next/next/no-location-assign-relative-destination`
    (`window.location.assign` used to navigate client-side; intentional for a non-router
    after-login hand-off).
- The dev-only CSP `script-src` violations from React/Next `eval()` probes are **expected**
  in dev; the strict CSP intentionally omits `unsafe-eval`. `security.spec.ts` allows
  violations whose `violatedDirective === "script-src"` and fails on any *other* directive.

---

## 9. Coordination / sequencing caveats

- **Browser (3100) and integration (3000) are separate servers.** Don’t point them at each
  other’s port. Integration succeeds against `next dev` only (needs OTP mock), not a prod build.
- **Integration mutates the shared seed game**: its scan-matrix adds real scores to
  seed-game teams. This is safe for the browser suite (which asserts `> 0`, never exact),
  but to keep seed scores clean, run **sequentially, not in parallel** with browser tests.
- Integration self-cleans its QA fixtures (deletes `QA-*` games/teams and created phones)
  in a `finally` block; the browser `global-setup` + per-spec `afterAll` likewise clean
  `+21269991*`/`QA-Browser-*`/orphan teams.
- The browser suite is deterministic at `workers=1`, `retries=0`, `timeout=90s`. If you
  parallelize, expect flakiness from the shared seed game and from SSE timing.

---

## 10. Committed scope (this handoff)

A single commit on `main` contains:
- `tests/browser/` (entire Playwright suite: config, global-setup, fixtures, helpers, specs)
- `hooks/use-camera.ts` (the decode fix above)
- `.gitignore` (test-output ignores)
- `package.json` + `package-lock.json` (Playwright/`@types/qrcode` devDeps, the `test` script
  fix, `test:browser` / `test:browser:headed` scripts)

**Not committed (never stage):** the user’s personal repository files
`PLAN.md`, `scavenger_hunt.pdf`, `stitch_hydraulic_echoes_of_casablanca.zip`, and the
`stitch_hydraulic_echoes_of_casablanca/` directory. `main` is otherwise untouched.
