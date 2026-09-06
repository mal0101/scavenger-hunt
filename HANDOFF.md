# Scavenger-Hunt — Handoff: Credentials Auth + Single-Claim QR + Teams + Dashboard

This document is the operational handoff for the coordinated milestone work on branch
`feat/credentials-teams-dashboard-qr-value`: **M1** credentials auth (username + password),
**M4** single-claim QR (a code is fully depleted the first time it is scanned),
**M2** captain-managed teams, **M3** player dashboard (team rank + passed challenges) with
a leaderboard DB fallback and an admin SSE-driven leaderboard dashboard, and **M5** the
no-team join flow. All five pieces land on one re-anchored unit/integration/browser test
surface.

Everything below was **verified live** (unit, typecheck, lint, build, integration,
Playwright browser) in this session.

---

## 1. Verified status (the only thing that matters)

| Tier | Command | Result |
|---|---|---|
| Unit | `npm test` | **43 / 43** |
| TypeScript | `npx tsc --noEmit` | clean (exit 0) |
| Lint | `npm run lint` | 0 errors; 3 pre-existing warnings (see §8) |
| Build | `npm run build` | success (exit 0) |
| Migration | `prisma migrate reset --force` + seed | applied clean, reseeded (M1) |
| Integration | `BASE_URL=… npm run test:integration` | **107 assertions PASSED** |
| Browser | `npm run test:browser` (dev server on 3100) | **38 / 38 PASSED** |

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
    → no-team join screen `/team` per M5), crewed dashboard profile display, mentor
    routing, player-can't-reach-mentor, logout clearing session.
  - `shell.spec.ts` — every player page renders while authenticated (user is crewed so
    the dock is reachable).
  - `team.spec.ts` — captain crew/invite/controls view, team-less prompt with inline
    **create + join-by-invite forms**, and the `/dock` → `/team` redirect for team-less
    players.
  - `scan.spec.ts` — **full camera pipeline** (synthetic canvas stream → decode →
    verify → **full-pool** score → result page), tampered-QR error banner, camera-denied
    UX, and a **depleted-code injection** (re-scanned QR → `QR_DEPLETED`).
  - `sse.spec.ts` — leaderboard fan-out across two sessions with no reload; live timer
    countdown ticking.
  - `mentor.spec.ts` (also desktop) — game detail state controls/config, full state
    machine, **dashboard hero streaming the live leaderboard over SSE**, batch QR
    generation.
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
- The scan route (`app/api/v1/games/[id]/scan`) looks up the QrCode by `code_id` and rejects
  unknown/depleted codes (`QR_UNKNOWN_CODE` / `QR_DEPLETED`). Value is a **stable reduced
  pool**: the FIRST scan pays the full original `points`; from the SECOND scan onward every
  claim pays the reduced value (67% of the original `points`, i.e. 33% off) and stays at that
  value for all subsequent scans — it does not keep shrinking. The shared `pool_value` is set
  to the reduced amount so later scans know the current rate. Player + team scores and
  Redis/SSE are updated per scan.

### Teams (M2)
- `Team.captain_id` (created player becomes captain). **M2 added the full captain
  management surface**:
  - `GET /api/v1/players/me/team` — team detail including `members` (username/nickname/
    score/status), `is_captain` (requester view), `member_count`, and captain membership
    flags; returns `{ team: null }` when the player is not in a team.
  - `DELETE /api/v1/players/me/team` — leave team. The captain cannot leave while
    crewmates remain (`CAPTAIN_CANNOT_LEAVE`); a sole member's leave disbands the team.
  - `DELETE /api/v1/players/me/team/members/[playerId]` — captain-only kick (403 for
    non-captains, `NOT_YOUR_TEAM` cross-team, captains cannot self-kick).
  - `PATCH /api/v1/players/me/team/members/[playerId]` — captain-only leadership
    transfer.
- Player UI: new `/team` page (crew list, invite code copy, kick/transfer/leave
  controls) reachable from the dock Quick Actions. No new player nav item (kept the
  4-item shell).
- Integration S3 covers the full matrix (kick/403, rejoin, captain-blocked-leave,
  transfer, promote-then-leave, lone-captain disband). Browser `team.spec.ts` covers
  the captain view, the team-less prompt + inline create, join-by-invite-code, and the
  /dock → /team redirect; `/team` renders in `shell.spec.ts`.

### Player dashboard + leaderboard robustness (M3)
- `lib/game/leaderboard.ts` `getTeamRank` now falls back to the **DB ordering**
  (`total_score desc, created_at asc`) when Redis is mock/absent/empty, so a team that
  has never scored (or a dev with blank Upstash vars) still gets a concrete rank. The
  zset path stays first when real Redis is configured; a missing member falls through.
- `GET /api/v1/players/me` now also returns `passed_challenges` (scan count —
  `Scan @@unique([player_id, index_id])` makes each passed index count once) and
  `team_rank` (`null` when not in a team).
- Player dock (`app/(player)/dock/page.tsx`) "Your Status" is now a 4-tile grid:
  Score, Team Rank (`#n`), Passed, Team.
- Mentor dashboard (`app/(mentor)/mentor/dashboard/page.tsx`) hero leaderboard is now
  **SSE-driven** via `useLeaderboard`, with a LIVE/POLLING badge and a
  "Waiting for teams to scan…" empty state; the REST 15s detail poll remains as fallback.
  `useLeaderboard`'s entry type gained the optional `member_count` the SSE emits.
- Browser `scan.spec.ts` asserts the dock tiles after a real scan (rank `#n`, Passed 1);
  `mentor.spec.ts` asserts the dashboard hero subscribes ("Live Leaderboard" + Manage Hunt).

### No-team join flow (M5)
- `app/(player)/dock/page.tsx` redirects a team-less player to `/team` after loading
  (`router.replace`, guarded so it never loops).
- `app/(player)/team/page.tsx` team-less state now has **inline create-crew** (name input)
  and **join-by-invite-code** (6-char input) forms; success refetches the crew view.
- `teamSchema.invite_code` stays optional, but `team_name` is now **optional** so a
  join-by-code POST needs no dummy name; the create branch rejects a missing name with
  `VALIDATION_ERROR`.
- Browser `team.spec.ts` adds join-by-invite UI + dock-redirect tests; `auth.spec.ts` and
  `shell.spec.ts` were realigned (the shell/auth users now get a crew because the dock is
  no longer reachable team-less; the fresh-login flow asserts it lands on `/team`).

### Remarks / dead code
- `calculateScanScore` (time bonus) is no longer used by the scan route (QR value is now a
  fixed pool). It remains in `lib/game/engine.ts` and is still unit-tested; it is harmless
  legacy until the windowed-decay idea is definitively retired.
- The login page uses **plain `fetch`** (not `apiFetch`) because a 401 there is an expected
  login failure that must render the friendly error — routing it through `apiFetch` made it
  try the refresh path and reload `/login`, wiping the message.
- Both QR routes (`indexes/generate` batch and `indexes/[id]/qr`) **re-arm** a QrCode on
  upsert (ACTIVE, full pool, `first_scanned_at: null`) — generating is the mentor's
  explicit re-provision action, matching the browser `global-setup`.

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
  Integration succeeds against `next dev` only (mock Redis), not a prod build. Only one
  `next dev` process may run per repo dir (Next 16 refuses a second), so run the two
  suites **sequentially**, restarting the server on the new port between tiers — or just
  re-point `PW_BASE_URL`/`BASE_URL` at whichever port is live.
- **Both suites mutate the shared seed game.** Both **re-arm the seed QR codes** at the
  start of their run (integration in `createFixtures()`, browser in `global-setup`), so
  each suite is idempotent and can be re-run repeatedly. Run them sequentially regardless
  (single-claim codes + the Next-16 single-server constraint).
- **`npm run test:browser` must point at the browser config** (it now does):
  `playwright test --config=tests/browser/playwright.config.ts`. Running plain
  `playwright test` from the repo root never loads `tests/browser/playwright.config.ts`,
  so `baseURL`/global-setup silently don’t run (failures: “Cannot navigate to invalid URL”).
- Integration self-cleans its `qa_int_*` users, `QA-*` games/teams, and the transition game
  in a `finally` block; the browser `global-setup` + per-spec `afterAll` clean `qa_*` users,
  `QA-Browser-*` games, and orphan teams.
- The browser suite is deterministic at `workers=1`, `retries=0`, `timeout=90s`.

---

## 10. Committed scope / next up

This handoff covers **three commits** on `feat/credentials-teams-dashboard-qr-value`:

1. **M1 + M4 core** — credentials auth (schema, libs, admin user routes, login UI), the
   `QrCode` single-claim model through generator/validator/scan route, rewritten
   unit/integration/browser tests, test-suite invocation fixes, and the base handoff.
2. **M2** — captain-managed teams: `GET/DELETE players/me/team` + captain-only
   `DELETE/PATCH players/me/team/members/[playerId]`, the `/team` player UI, integration
   S3 captain matrix, browser `team.spec.ts`, plus fixes surfaced by running the real
   tiers (login plain-fetch, `test:browser` config path, integration QR re-arm + scan-team
   setup, `scan.spec` user-isolation, QR re-arm on generate).
3. **M3 + M5 (current)** — dashboard stats (pass challenge count + team rank via DB-fallback
   `getTeamRank`), 4-tile player dock, SSE-driven mentor dashboard hero, inline
   create/join forms on `/team`, and the team-less dock → `/team` redirect; integration M3
   checks, browser dashboard/team/auth/shell realignments, and a deterministic
   tampered-signature fix (XOR-tainted first hex digit instead of a no-op `"0"` prefix).

The five coordinated milestones (M1 credentials auth, M4 single-claim QR, M2 captain
teams, M3 player dashboard + leaderboard, M5 no-team join) are all implemented and
verified. No milestone work remains pending.

**Not committed (never stage):** the user’s personal repo files `PLAN.md`,
`scavenger_hunt.pdf`, `stitch_hydraulic_echoes_of_casablanca.zip`, and the
`stitch_hydraulic_echoes_of_casablanca/` directory.