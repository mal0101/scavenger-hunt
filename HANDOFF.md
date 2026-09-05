# Scavenger-Hunt — Handoff: Milestone 1 (Credentials Auth + Single-Claim QR)

This document is the operational handoff for the **Milestone 1** work on branch
`feat/credentials-teams-dashboard-qr-value`. It replaces OTP/phone auth with
**username + password** credentials, adds the **single-claim QR** model (a code is
fully depleted the first time it is scanned), and re-anchors the entire test surface
(unit, integration, Playwright browser) on that model.

Everything below was **verified live** this session (unit, typecheck, lint, build,
migration reset + seed).

---

## 1. Verified status (the only thing that matters)

| Tier | Command | Result |
|---|---|---|
| Unit | `npm test` | **43 / 43** |
| TypeScript | `npx tsc --noEmit` | clean (exit 0) |
| Lint | `npm run lint` | 0 errors; 3 pre-existing warnings (see §8) |
| Build | `npm run build` | success (pages include `/login` only; `/verify` removed) |
| Migration | `prisma migrate reset --force` + seed | applied clean, reseeded |

Browser (`npm run test:browser`) and integration (`npm run test:integration`) require a
running dev server — see §2 and §3.

---

## 2. Runtime prerequisites (read this before running anything)

### `.env.local` (at repo root) — required for the app + all tiers
Key names:

```
DATABASE_URL  UPSTASH_REDIS_REST_URL  UPSTASH_REDIS_REST_TOKEN
JWT_SECRET  JWT_REFRESH_SECRET  JWT_EXPIRY  JWT_REFRESH_EXPIRY
HMAC_SECRET  CREDENTIALS_SEED_ADMIN_PASSWORD  CREDENTIALS_SEED_PLAYER_PASSWORD
NEXT_PUBLIC_APP_URL  NODE_ENV
```

Critical flags:
- **Auth is now credentials-based.** OTP/Twilio env vars (`OTP_MOCK`, `TWILIO_SID`,
  `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE`) were removed from `.env.example`. `HMAC_SECRET`
  and the QR-section vars are kept.
- `NODE_ENV="development"`.
- `HMAC_SECRET` — the test QR helpers mirror `lib/utils/crypto.ts` (fallback
  `dev_hmac_secret_change_in_production`) and read this env, so test-signed QR payloads
  match what the app validates. Keep `.env.local`'s `HMAC_SECRET` intact for the suite.
- Seed credentials (env-overridable):
  - admin `mentor` / `CREDENTIALS_SEED_ADMIN_PASSWORD` (default `ChangeMe_Admin_2026!`)
  - dev players `player1`–`player4` / `CREDENTIALS_SEED_PLAYER_PASSWORD`
    (default `DevPass_2026!`)

### Two different dev servers (do not mix ports)
- **Browser suite** expects a dev server on **3100**.
- **Integration suite** defaults to **3000**, overridable with `BASE_URL`.

Start the browser-tier server like this (from repo root):
```bash
UPSTASH_REDIS_REST_URL= UPSTASH_REDIS_REST_TOKEN= PORT=3100 npm run dev
```
(Intentionally blanking the Upstash vars keeps Redis-backed rate-limiting off in dev.)

### Seed data the suites depend on
- Seed game `00000000-0000-0000-0000-000000000001` must be **ACTIVE**, `current_round = 1`,
  with **5 indexes** on that round. Each index has one **QrCode** row (`qr_codes` table,
  `@@unique([index_id, round_id])`). `tests/browser/global-setup.ts` restores this at the
  start of every browser run: resets status/round, re-points round-1 indexes, **re-arms
  all seed QR codes to `ACTIVE` with a full pool**, deletes `qa_*` users and `QA-Browser-*`
  games, and sweeps orphan teams.

**Important:** because each seed QR is single-claim, the browser specs intentionally
partition the seed indexes so no two spec tests fight over the same code:
- `scan.spec.ts` claims **index offset 0** (full-scan + tampered) and **index offset 1**
  (depleted/claim).
- `sse.spec.ts` claims **index offset 2** for its live-fan-out scan.

### Prisma note
The Prisma CLI does not auto-load `.env.local`. Prefix any `prisma`/`seed` command with:
```bash
set -a; source ./.env.local; set +a
```

### Playwright install
```bash
npx playwright install chromium
```
Needs one-time browser download.

---

## 3. How to run each tier (from repo root)

```bash
# Unit — self-loads .env.local
npm test

# Integration — needs a server on 3000 (start one first), or point at a running one:
BASE_URL=http://localhost:3100 npm run test:integration

# Browser — server must already be live on 3100 (see §2)
npm run test:browser        # headless, both projects
npm run test:browser:headed # headed
```

You can also target a single spec (from `tests/browser`):
```bash
npx playwright test scan --project=player-mobile
npx playwright test sse --project=player-mobile
```

---

## 4. What the Playwright browser suite covers

`tests/browser/` is self-contained (own `playwright.config.ts`, `fixtures/`, `helpers/`,
`global-setup.ts`). Two projects run serially (`workers=1`, no parallelism):

- `player-mobile` (Pixel 7, 390×844, touch, camera+geolocation permissions):
  - `auth.spec.ts` — unauthenticated guard/redirect, public pages, **credentials UI
    login flow** (short-username client error, unknown-account server error, valid login
    → `/dock`), mentor routing, player-can't-reach-mentor, logout clearing session.
  - `shell.spec.ts` — every player page renders while authenticated.
  - `scan.spec.ts` — **full camera pipeline** (synthetic canvas stream → decode →
    verify → **full-pool** score → result page), tampered-QR error banner, camera-denied
    UX, and a **depleted-code injection** (re-scanned QR → `QR_DEPLETED`).
  - `sse.spec.ts` — leaderboard fan-out across two sessions with no reload; live timer
    countdown ticking.
  - `mentor.spec.ts` (also desktop) — game detail state controls/config, full state
    machine, batch QR generation.
  - `security.spec.ts` (also desktop) — headers, Permissions-Policy, CSP-clean journey.
  - `pwa.spec.ts` (also desktop) — SW serves/registers, static asset caching, offline nav.
- `mentor-desktop` (Desktop Chrome, 1440×900) — `testMatch: /(mentor|security|pwa)\.spec\.ts/`.

The error-collector fixture (`fixtures/base.ts`) fails a test on any uncaught page error,
console `error` (outside the dev allowlist), HTTP ≥ 500, or failed request. `collect(page)`
attaches the same collectors to extra pages (e.g. the second SSE context).

---

## 5. Milestone 1 changes

### Credentials auth
- `User.username @unique` + `password_hash` (`bcryptjs`, cost 10); `phone_number String?`
  kept but no longer an identifier; OTP model/table dropped.
- New `lib/auth/passwords.ts` (hash/verify) and `lib/auth/session.ts` (issueSession).
  `lib/auth/jwt.ts` + `guard.ts` now carry `{ sub, role, username }`; middleware sets
  `x-user-username`. Removed `lib/auth/otp.ts` and `lib/sms/`.
- New `POST /api/v1/auth/login` (rate-limited, auto-provisions a PLAYER into the active
  game), `GET/POST /api/v1/admin/users`, and
  `POST /api/v1/admin/users/[id]/reset-password` (revokes the refresh family).
  Deleted `send-otp` / `verify-otp`.
- Login UI (`app/(auth)/login/page.tsx`) rewritten; `/verify` deleted. PUBLIC_ROUTES are
  now `["/login","/role-select"]`. Rate limiters: `loginLimiter` 10/5m, `scanLimiter` 10/1m,
  `refreshLimiter` 10/1m, `generalLimiter` 100/1m.

### Single-claim QR (M4 core)
- New `QrCode` model (`id`, `index_id`, `game_id`, `round_id`, `points`, `pool_value`,
  `status ACTIVE|DEPLETED`, `first_scanned_at`, `created_at`;
  `@@unique([index_id, round_id])`).
- The QR payload now embeds `code_id`: `{ code_id, index_id, game_id, round_id, timestamp,
  signature }`, and the signature is HMAC over
  `${codeId}:${indexId}:${gameId}:${roundId}:${timestamp}` (`lib/utils/crypto.ts`).
- `generateQrImage`/`generateQrSvg` from the admin `indexes/[id]/qr` and `indexes/generate`
  routes **provision** a QrCode row (upsert) and embed its `code_id`; the response returns
  `code_id`, `pool_value`, and `status`.
- The scan route (`app/api/v1/games/[id]/scan`) looks up the QrCode by `code_id`, rejects
  unknown/depleted codes (`QR_UNKNOWN_CODE` / `QR_DEPLETED`), and **atomically claims** the
  code via `updateMany({ status: "ACTIVE" }) → status DEPLETED, pool_value 0,
  first_scanned_at`. It awards the full `pool_value` (no time-based multiplier) and
  increments player + team scores and Redis/SSE as before.
- `tests/browser/global-setup.ts` re-arms all seed QR codes to ACTIVE + full pool each run.

### Teams
- `Team.captain_id` (created player becomes captain); the `players/me/team` create route
  sets it. A full separate M2 (captain manages up-to-4 members) is **not yet** implemented;
  this milestone only wires the creator as captain and keeps the existing
  create/join-by-invite flow.

### Remarks / dead code
- `calculateScanScore` (time bonus) is no longer used by the scan route (QR value is now a
  fixed pool). It remains in `lib/game/engine.ts` and is still unit-tested; it is harmless
  legacy until the windowed-decay idea is definitively retired.

---

## 6. QR camera testing — how it works & the real-camera checkpoint

- Browser tests do not need a physical camera. `helpers/camera.ts` injects a synthetic
  canvas stream that paints the real signed QR each frame; html5-qrcode decodes it.
- `helpers/qr.ts` mirrors the new `lib/utils/crypto.ts` (HMAC payload includes `code_id`)
  and `lib/qr/generator.ts` (payload includes `code_id`). Tests obtain a valid `code_id`
  via `helpers/db.ts` → `getQrCodeForIndex(indexId, roundId)`.
- **Manual real-camera checkpoint (optional):** `npm run test:browser:headed`, open `/scan`,
  point at a freshly generated mentor QR. Note each code is single-claim — after one scan
  it is `DEPLETED` and any further scan reports `QR_DEPLETED`.

---

## 7. Data-model / state-machine notes (mentor, scan, SSE)

- Valid mentor transitions: `PENDING→ACTIVE (start)`, `ACTIVE→ELIMINATING (eliminate)`,
  `ELIMINATING→ACTIVE (next_round) / FINISHED (finish)`, `FINISHED→PENDING (reset)`.
  `game_id × round_number` is unique — do not pre-create a round the `start` action will
  recreate. The browser suite creates an isolated `QA-…` PENDING game with a roundless
  index for the state-machine test, then deletes it in `afterAll`.
- Scan scoring is now the **full `pool_value`** of the QR; tests assert **exact** equality
  with `index.points` (no time multiplier). A tampered QR yields
  `"QR code invalid: QR_SIGNATURE_INVALID"`.
- `/scan-result?type=*&data=*` carries JSON `{ index_label, points_earned, team_total,
  scan_id }`; specs parse `data` from the URL.
- Leaderboard row structure (for locators): each team is `div.flex.items-center` (row) →
  `div.flex-1` (name) + `div.text-right` (score `p.font-headline.text-lg` + `pts`).

---

## 8. Known non-issues (leave them alone)

- `tsc --noEmit` clean.
- Lint: 0 errors, **3 pre-existing warnings**:
  - `app/layout.tsx:41,45` `@next/next/no-page-custom-font`.
  - `lib/api-client.ts:57` `@next/next/no-location-assign-relative-destination`.
- The dev-only CSP `script-src` violations from React/Next `eval()` probes are expected;
  `security.spec.ts` allows `script-src` and fails on any other directive.

---

## 9. Coordination / sequencing caveats

- **Browser (3100) and integration (3000) are separate servers.** Don’t mix ports.
  Integration succeeds against `next dev` only (mock Redis), not a prod build.
- **Both suites mutate the shared seed game.** Because seed QRs are single-claim, run them
  **sequentially, not in parallel** — otherwise the scan specs and the integration scan
  matrix can exhaust the same scarce codes. The browser `global-setup` re-arms codes at
  the start of each browser run, but a parallel integration run would race it.
- Integration self-cleans its `qa_int_*` users, `QA-*` games/teams, and the transition game
  in a `finally` block; the browser `global-setup` + per-spec `afterAll` clean `qa_*` users,
  `QA-Browser-*` games, and orphan teams.
- The browser suite is deterministic at `workers=1`, `retries=0`, `timeout=90s`.

---

## 10. Committed scope / next up

This milestone commits the **M1 + the single-claim QR core (M4)** end-to-end:
credentials auth (schema, libs, admin user routes, login UI), the `QrCode` single-claim
model through generator/validator/scan route, the rewritten unit/integration/browser test
surface, and the updated HANDOFF.

**Not yet implemented (next milestones):**
- **M2** — captain manages up to 4 members (separate captain routes, team page UI).
- **M3** — player dashboard (team rank + passed challenges) + leaderboard DB fallback for
  `getTeamRank` + admin SSE leaderboard page.
- **Not committed (never stage):** the user’s personal repo files `PLAN.md`,
  `scavenger_hunt.pdf`, `stitch_hydraulic_echoes_of_casablanca.zip`, and the
  `stitch_hydraulic_echoes_of_casablanca/` directory.