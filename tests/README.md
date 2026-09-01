# Tests

Zero-dependency test suites (built on Node's built-in `node:test` + `fetch`,
run through `tsx`). No Playwright, no extra dev dependencies.

## Unit tests

Pure logic + DB-backed OTP verification:

- `engine` — state-machine transitions, scan scoring, elimination math
- `crypto` — HMAC signing/verification, invite-code generation
- `validation` — zod schema boundaries for every API input
- `qr` — payload sign/verify round-trip, expiry/clock/mismatch rejection matrix
- `otp` (DB-backed) — real (non-mock) OTP store: expiry, attempt limits,
  invalidation semantics

```sh
export DATABASE_URL="postgresql://scavenger_hunt@localhost:5432/scavenger_hunt"
npm test                     # => tsx --test tests/unit/*.test.ts
```

The `otp` DB tests fail fast if `DATABASE_URL` is missing.

## Integration suite

`tests/integration/run.ts` drives a **live dev server over HTTP** and covers:

- S1 auth lifecycle (send/verify, cookie issuance, me, nickname validation,
  refresh rotation, logout cookie clearing, garbage-token rejection)
- S2 player auto-registration into the active seeded game
- S3 teams (create, join via invite, `TEAM_FULL` at 4 members, `INVALID_CODE`,
  `MAX_TEAMS_REACHED` at the 100-team cap)
- S4 scan matrix (exact score vs engine formula, `ALREADY_SCANNED`,
  `QR_ROUND_MISMATCH`, `QR_SIGNATURE_INVALID`, `QR_GAME_MISMATCH`, `QR_EXPIRED`,
  `QR_FUTURE_TIMESTAMP`, `QR_DECODE_FAILED`, `NO_TEAM`, `GAME_NOT_ACTIVE`,
  mentor-403, scan-history ledger)
- S5 admin (runtime config truthfulness incl. `timer_sync_interval: 10000`,
  batch + single QR endpoint shapes, game create validation, full
  PENDING→ACTIVE→ELIMINATING→ACTIVE→FINISHED→PENDING state machine)
- S6 SSE (timer + leaderboard frames streamed, sorted leaderboard, 401 without token)
- S7 ledger/telemetry (admin teams views + per-game endpoint)

### Run it

1. Provision the DB: `prisma migrate deploy` + `npm run db:seed` (idempotent).
2. Start the dev server **in mock Redis mode** (empty Upstash vars force the
   local mock — they must be set in the shell so the server prefers them over
   `.env.local`'s placeholder):

   ```sh
   export UPSTASH_REDIS_REST_URL=
   export UPSTASH_REDIS_REST_TOKEN=
   npm run dev
   ```

   > The placeholder `UPSTASH_REDIS_REST_URL=https://placeholder.upstash.io/...`
   > in `.env.local` is intentionally NOT usable — it points at an unreachable
   > host, and code path flags it as "real" only when both URL and token are
   > present.

3. In another shell:

   ```sh
   export UPSTASH_REDIS_REST_URL=
   export UPSTASH_REDIS_REST_TOKEN=
   npm run test:integration      # => tsx --env-file=.env.local tests/integration/run.ts
   ```

   Set `BASE_URL` to point elsewhere if the server is not on port 3000.

### Fixtures, isolation & cleanup

The runner provisions a `QA-Full-Game` (already at the 100-team cap), a
`QA-Pending-Game` with a pre-joined team, and deletes every `QA-*` game/team/user
it creates (plus its own transition game) before it exits — re-runnable against
the same database without manual cleanup. Players use random phones per run.

### Intentionally not asserted in mock mode

These paths depend on a real Redis (Upstash) and cannot be observed with the
local mock, which returns `null` for every store read:

- **Refresh-token reuse detection** (the `refresh_token:<sub>` family key is
  always `null` in the mock, so a rotated-away token is not rejected).
- **Logout revocation of the refresh token** (server-side family-key delete —
  verification requires real Upstash).
- **Rate limiting** (`RATE_LIMITED` on scan/OTP/refresh) — the `LocalRedisMock`
  makes `@upstash/ratelimit` limiter calls throw, and the rates fail **open**
  outside production+real-Upstash by design.

Verify those three against a real Upstash endpoint before a production release.

## Production gate

The same suite runs against a production build:

```sh
npm run build
UPSTASH_REDIS_REST_URL= UPSTASH_REDIS_REST_TOKEN= npm run start
npm run test:integration
```

(`OTP_MOCK=true` in `.env.local` is permitted in dev only — a production build
rejects mock OTP with an explicit error.)