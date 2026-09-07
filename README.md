# Gadz'arts Compass — Steampunk Scavenger Hunt

A real-time, code-scanning **scavenger hunt** platform with a "Steampunk Amber Mariner"
theme, built for team events (e.g. an ENSAM Casablanca campus hunt). Mentors create
games & QR checkpoints ("indexes"), players join teams, scan QR codes at physical
locations to resolve **enigma** puzzles or trigger **traps**, and teams are eliminated
round-by-round until a winner is declared.

> **Design language:** "Amber Mariner" — dark brass surfaces (`#1c110c`), amber glows
> (`#d97707` / `#ffb77d`), Moroccan scalloped arches, rivets, glass panels, animated
> steam/water. The intended look is defined in static HTML prototypes under
> `stitch_hydraulic_echoes_of_casablanca/` and the design tokens live in
> `app/globals.css`.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [How the app works](#how-the-app-works)
3. [Quick start (local dev)](#quick-start-local-dev)
4. [Environment variables](#environment-variables)
5. [Database](#database)
6. [Seeding & demo data](#seeding--demo-data)
7. [Testing the app end-to-end (mock OTP)](#testing-the-app-end-to-end-mock-otp)
8. [Project structure](#project-structure)
9. [API reference](#api-reference)
10. [Game state machine](#game-state-machine)
11. [Design system / how to style](#design-system--how-to-style)
12. [Common workflows for a developer](#common-workflows-for-a-developer)
13. [Troubleshooting](#troubleshooting)
14. [Deployment notes](#deployment-notes)

---

## Tech Stack

| Layer      | Tech                                                              |
| ---------- | ----------------------------------------------------------------- |
| Framework  | **Next.js 16** (App Router, React 19, TypeScript, Tailwind CSS v4)|
| Database   | **PostgreSQL** via **Prisma** (schema in `prisma/schema.prisma`)  |
| Cache/Rate-limit | **Upstash Redis** (falls back to an in-memory `LocalRedisMock` when no URL is configured) |
| Auth       | **JWT** (`jose`) — short-lived access token + rotating refresh token with reuse detection |
| OTP        | **Twilio** for real SMS, or **mock mode** (`OTP_MOCK=true` → code `000000`) |
| QR         | `qrcode` (server-side SVG/PNG generation), `html5-qrcode` (player camera scanning) |
| State      | React state + `zustand` |
| Validation | `zod` |

**Scripts** (`package.json`):

```bash
npm run dev          # start dev server (http://localhost:3000)
npm run build        # production build
npm run start        # serve production build
npm run lint         # eslint
npm run db:generate  # prisma generate (regenerate client after schema edits)
npm run db:push      # push schema to DB (dev; no migration file)
npm run db:migrate   # create & apply a migration
npm run db:seed      # seed demo data (mentor, game, round, indexes)
npm run db:studio    # open Prisma Studio GUI
```

---

## How the app works

1. **Auth.** A user enters a phone number → gets an SMS OTP (`/send-otp`) → verifies it
   (`/verify-otp`) → a JWT access token + rotating refresh token are set as httpOnly
   cookies. A user with role `MENTOR` lands on the mentor dashboard; **PLAYER** users
   pick a role/team experience.
2. **Games.** A mentor creates a game with `max_rounds`, `round_duration`, and
   `elimination_pct` (bottom % cut each round).
3. **Indexes (QR checkpoints).** A mentor creates indexes per game, then generates a
   physical QR code for each (`POST /api/v1/admin/indexes/generate`). Each QR encodes a
   signed, time-fresh payload.
4. **Play.** A player in a team scans a QR at a checkpoint (`/scan`). If the index is an
   **enigma**, they must solve a cipher puzzle; **trap** indexes arm a timed relay
   sequence that can flood/breach the vault. Points land on the player → summed to the
   team.
5. **Rounds & elimination.** The mentor drives the game state machine (see below): each
   round the bottom `elimination_pct` of teams by score are eliminated, a new round
   starts, until the mentor declares a winner.
6. **Live UI.** Leaderboards and timers are refreshed client-side via SSE or polling
   (see `hooks/use-leaderboard.ts`, `hooks/use-timer.ts`).

---

## Quick start (local dev)

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local
#    → fill in DATABASE_URL and JWT secrets (see Env section). OTP_MOCK stays "true"
#      for local dev so you never need real SMS.

# 3. Push the Prisma schema to your local/cloud Postgres
npm run db:generate
npm run db:push

# 4. Seed demo data (mentor, game, round, 5 indexes)
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open **http://localhost:3000/login** and follow the mock-OTP flow below.

> Local Redis is **not required**. When `UPSTASH_REDIS_REST_URL` is empty, the app uses
> `LocalRedisMock`: rate limiting and JWT refresh-token family tracking become
> pass-through. Set a real Upstash URL for those features to actually throttle/enforce.

---

## Environment variables

Everything the app reads (with notes). See `.env.example` for a template.

| Variable | Required? | Notes |
| -------- | --------- | ----- |
| `DATABASE_URL` | **yes** | Postgres/Neon connection string |
| `JWT_SECRET` | **yes** | 64-char random; signs access tokens |
| `JWT_REFRESH_SECRET` | **yes** | 64-char random; signs refresh tokens |
| `HMAC_SECRET` | **yes** | signs QR payloads |
| `JWT_EXPIRY` | no (default 900) | access token TTL (s) |
| `JWT_REFRESH_EXPIRY` | no (default 604800) | refresh token TTL (s) |
| `OTP_MOCK` | no (default from .env) | `"true"` → accept `000000`, no SMS |
| `OTP_EXPIRY_SECONDS` | no (default 300) | OTP validity window |
| `TWILIO_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE` | no (mock mode) | real SMS provider creds |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | no | Upstash; empty → local mock |
| `NEXT_PUBLIC_APP_URL` | no | canonical public URL |
| `NODE_ENV` | no | `development` / `production` |

> ⚠️ `OTP_MOCK=true` is rejected in production (`NODE_ENV=production`) by design.

Generate JWT/HMAC secrets:

```bash
openssl rand -hex 32
```

---

## Database

- ORM: **Prisma**. Schema: `prisma/schema.prisma`.
- Models: `User`, `OTP`, `Game`, `Round`, `Index`, `Player`, `Team`, `Scan` (+ enums
  `UserRole`, `GameStatus`, `RoundStatus`, `PlayerStatus`).
- To change a model: edit `schema.prisma` → `npm run db:generate` →
  `npm run db:push` (dev) or `npm run db:migrate` (adds a versioned migration).
- `npm run db:studio` opens a GUI to inspect/edit rows while developing.

---

## Seeding & demo data

`npm run db:seed` (via `prisma/seed.ts`) upserts:

- A **MENTOR** user: phone `+212600000001`, nickname `Admin Mentor`.
- A game: `ESCAPE ROOM — Kick-off Week 2026` (3 rounds, 1800s, 20% cut) — status
  `ACTIVE`, round 1 active.
- 5 indexes with a `round_id` (so **QR generation works immediately**) — e.g.
  *The Clocktower (50pt, visual)*, *The Enigma Vault (75pt, logic)*.

Use the mentor phone above (+ any `000000` code) to log in as mentor after seeding.

---

## Testing the app end-to-end (mock OTP)

With `OTP_MOCK=true`, every OTP flow accepts the code **`000000`**. This is how you test
both roles without Twilio:

**As a Mentor (admin):**
1. Go to `/login`.
2. Enter **`+212600000001`** (the seeded mentor) and request a code.
3. Enter **`000000`** — you are authenticated as `MENTOR` and routed to
   `/mentor/dashboard`.
4. From there:
   - **Games** → create a game (title, description, max rounds, round duration, cut %),
     click into it to **Start Game → Eliminate Bottom X% → Next Round / Declare Winner
     → Reset**.
   - **Indexes** → create indexes, pick a game in the filter, click **Generate QR Codes**
     to see a real scannable QR per index (requires the game to have an active round —
     the seed provides one).
   - **Teams** → monitor live scores with a per-game filter and a 10s auto-refresh.
   - **Settings** → Operations Console: live env/Redis/OTP/DB status + sign out
     (`/api/v1/admin/runtime`).

**As a Player:**
1. Use a **different phone number** (e.g. `+212600000002`) on `/login` so you don't get
   the seeded mentor role.
2. Enter code **`000000`**.
3. On `/role-select` choose your experience (or if already assigned, you go to `/dock`).
4. Join/create a team, then use the player shell (`/scan`, `/enigma`, `/trap`, `/vault`,
   `/logs`, `/leaderboard`, `/dock`).

**API-level smoke test** (curl, mock OTP):

```bash
# request a code
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"+212600000001"}'

# verify with mock code — sets httpOnly auth cookies in the jar
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"+212600000001","code":"000000"}'

# call an admin endpoint using the cookies
curl -b cookies.txt http://localhost:3000/api/v1/admin/games
```

---

## Project structure

```
.
├── app/
│   ├── (auth)/                # login, verify, role-select
│   ├── (player)/              # dock, scan, scan-result, enigma, trap, vault,
│   │                          # leaderboard, logs
│   ├── (mentor)/mentor/       # dashboard, games, games/[id], indexes, teams, settings
│   ├── api/v1/...             # REST + SSE endpoints (see API reference)
│   ├── layout.tsx             # root layout (fonts, shell)
│   └── globals.css            # 🎨 design tokens + all steampunk utilities
├── components/
│   ├── layout/                # player-shell, mentor-shell (nav/skeletons)
│   └── ui/                    # gauge, gear, pipe, porthole, countdown, steam-toggle,
│                              # arch-panel, card, toggle …
├── hooks/                     # use-leaderboard, use-timer (SSE/polling)
├── lib/
│   ├── auth/                  # jwt, cookies, otp, guard (requireMentor etc.)
│   ├── db/                    # postgres (prisma), redis (upstash + mock), pubsub
│   ├── game/                  # engine (state machine), leaderboard
│   ├── qr/                    # QR generation (SVG/PNG signing)
│   ├── types/                 # shared TS types
│   ├── utils/                 # constants, validation (zod), rate-limiter
│   └── api-client.ts          # apiFetch (401 → refresh → retry → redirect /login)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── .env.example
└── package.json
```

**Route groups:** `(auth)`, `(player)`, `(mentor)` are Next.js route groups — they
organize URL-paths that stay flat (e.g. folder `(player)/scan` serves `/scan`,
`(mentor)/mentor/games` serves `/mentor/games`).

**Navigation config:** the sidebars are driven by `lib/utils/navigation.ts`
(`NAV_ITEMS` / `MENTOR_NAV_ITEMS`).

---

## API reference

All JSON APIs return `{ success, data?, message?, timestamp }`. Errors use the same
shape with `success:false` (helper types in `lib/types/api.ts`). Admin routes require a
`MENTOR` JWT (they call `requireMentor`).

### Auth
| Method | Path | Body | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/api/v1/auth/send-otp` | `{ phone_number }` | sends/returns OTP |
| POST | `/api/v1/auth/verify-otp` | `{ phone_number, code }` | sets auth cookies |
| POST | `/api/v1/auth/refresh` | — (cookie) | rotates tokens, reuse detection |
| GET  | `/api/v1/auth/me` | — (cookie) | current session identity |
| POST | `/api/v1/auth/logout` | — | clears cookies |

### Admin (mentor, `requireMentor`)
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET/POST | `/api/v1/admin/games` | list / create game |
| GET/PUT/DELETE | `/api/v1/admin/games/[id]` | detail / update config / delete |
| POST | `/api/v1/admin/games/[id]/state` | `{ action: start \| eliminate \| next_round \| finish \| reset }` |
| GET | `/api/v1/admin/games/[id]/teams` | teams for a game |
| GET/POST | `/api/v1/admin/games/[id]/indexes` | indexes of a game |
| GET/POST | `/api/v1/admin/indexes` | list (`?game_id=` filters) / create index |
| POST | `/api/v1/admin/indexes/generate` | batch QR for a game (`{ game_id, format? }`) |
| POST | `/api/v1/admin/indexes/[id]/qr` | single QR (`{ game_id, round_id, format? }`) |
| PUT/DELETE | `/api/v1/admin/indexes/[id]` | update / delete index |
| GET | `/api/v1/admin/teams` | teams (`?game_id=` filters) |
| GET | `/api/v1/admin/runtime` | env/Redis/OTP/game/session inspection (powers Settings) |

### Player / public
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/api/v1/games/active` | the active game |
| GET | `/api/v1/games/[id]/leaderboard` | leaderboard (DB fallback in `lib/game/leaderboard.ts`) |
| POST | `/api/v1/games/[id]/scan` | resolve a QR scan (rate-limited, QR-validated) |
| GET | `/api/v1/players/me` | current player |
| GET | `/api/v1/players/me/scans` | player's scan history |
| GET/POST | `/api/v1/players/me/team` | my team |

### SSE
| Path | Notes |
| ---- | ----- |
| `/api/v1/sse/leaderboard/[gameId]` | live leaderboard |
| `/api/v1/sse/timer/[gameId]` | live round timer |

---

## Game state machine

Driven by `lib/game/engine.ts`; transitions are triggered by
`POST /api/v1/admin/games/[id]/state`.

```
 PENDING ──start──▶ ACTIVE ──eliminate──▶ ELIMINATING ──next_round──▶ ACTIVE
                                          ELIMINATING ──finish───────▶ FINISHED
 FINISHED ──reset──▶ PENDING
```

- **`start`** — from `PENDING` → `ACTIVE` (round 1 begins).
- **`eliminate`** — from `ACTIVE` → `ELIMINATING`: computes the bottom
  `elimination_pct` of teams by score and marks them eliminated, closes the round.
- **`next_round`** — from `ELIMINATING` → `ACTIVE`: opens the next round.
- **`finish`** — from `ELIMINATING` → `FINISHED`: declares the leader the winner.
- **`reset`** — from `FINISHED` → `PENDING`: replay.

The mentor UI (`/mentor/games/[id]`) only shows the buttons valid for the current state
(note: **`finish` is only valid from `ELIMINATING`**, so it appears on the elimination
screen, not while a round is actively running).

---

## Design system / how to style

All styling lives in Tailwind v4 (`@theme` + plain CSS) in **`app/globals.css`**.

**Brand tokens** (defined in `@theme`, usable as Tailwind classes like `bg-surface`,
`text-primary`, `bg-primary-container`):
- `surface` `#1c110c` (base dark)
- `surface-container` / `-low` / `-high` (panel shades)
- `primary` `#ffb77d` · `primary-container` `#d97707` (amber CTA)
- `error` `#ffb4ab`, plus `outline`, `on-surface`, etc. (full Material scheme)

**Signature utility classes** (add them to any element):
| Class | Effect |
| ----- | ------ |
| `glass-panel` | blurred dark glass with amber top border |
| `arch-top` / `arch-moroccan` / `arch-pointed` | rounded vs true scalloped arch |
| `etched-text` / `etched-text-error` | metallic carved-looking headline |
| `brass-plate` | etched brass panel |
| `wood-grain` | wood texture |
| `rivet-border` / `rivet-corners` | corner rivets (add to bordered panels) |
| `btn-shimmer` | hovering metallic sheen sweep (add to primary CTAs) |
| `tube-track` / `tube-fill` | liquid-amber progress tube |
| `scan-sweep` / `scan-corner` | scanner line + corners |
| `steam-rise` / `animate-water-sway` / `heat-pipe-fill` | steam / water / flowing fill |
| `compass-swing`, `animate-gear-slow(-reverse)`, `animate-flicker-amber` | mechanical motion |
| `ambient-glow`, `engraved-separator` | vignette / riveted divider |

**Built-in primitives** under `components/ui/` (exported from `components/ui/index.ts`):
`Gauge`, `Gear`, `Pipe`, `Porthole`, `CountdownTimer`, `SteamToggle`, `SteamCard`,
`ArchPanel`, `Card`, `Toggle`. Check whether a primitive already exists before hand-rolling
inline styles.

**Brand assets & ambient atmosphere**
- Logos live in `public/branding/` as **WebP** (keep them ≤512²; they are displayed at most
  ~420 CSS px and are not cached by the service worker, see `STATIC_PREFIXES` in `public/sw.js`):
  - `ade_logo_medallion.webp` — the council seal rendered by `CouncilMedallion` (login lockup).
  - `ade_logo_kickoff_alpha.webp` — transparent kickoff seal, used as a faint watermark
    behind the auth card (`app/(auth)/layout.tsx`).
  - `ade_logo_kickoff.jpeg` — original shared logo (source master; not wired into the UI).
- `AmbientBackdrop` (`components/steampunk/ambient-backdrop.tsx`) paints a fixed, full-viewport
  ember/steam atmosphere in the root layout: **VGpu (WebGPU)** shader when available, raw-WebGL
  fallback otherwise. It is screen-blended (`mix-blend-screen`, 35% opacity), so page roots must
  keep **transparent** backgrounds (only `body` paints an opaque base) — never add opaque
  page-level backgrounds or the atmosphere disappears behind them.
- Motion budget: the backdrop auto-suspends while offscreen/tab-hidden, caps at 30fps, and renders
  a single static frame under `prefers-reduced-motion` (global reduced-motion CSS at the bottom of
  `globals.css`).

> **Updating the theme:** change the `@theme` color variables in `globals.css` and every
> component using those tokens updates automatically. To add a texture/motion, add a
> utility class there too.

---

## Common workflows for a developer

**Add a new mentor page**
1. Create `app/(mentor)/mentor/<name>/page.tsx` (a Client Component).
2. Add a nav entry to `MENTOR_NAV_ITEMS` in `lib/utils/navigation.ts`.
3. Reuse `rivet-corners`/`btn-shimmer`/`glass-panel` for consistency, and use `apiFetch`
   for authenticated calls so 401s auto-refresh.

**Add a new API endpoint**
1. Create `app/api/v1/<area>/<route>/route.ts` exporting `GET`/`POST`/… handlers.
2. If admin-only, call `await requireMentor(request)` first and `return auth` when it's
   a `Response` (it handles 401/403). Use `apiSuccess`, `apiError`, `apiCreated`,
   `apiNotFound`, `apiInternal` from `lib/types/api.ts`.
3. Validate inputs with `zod` (patterns in `lib/utils/validation.ts`).

**Use `apiFetch` instead of `fetch` in the browser**
`lib/api-client.ts` wraps `fetch`: on a `401` it tries `/auth/refresh`, retries the
original request once, and on failure redirects to `/login`. Prefer it for authenticated
calls (login/verify use raw `fetch` because those endpoints are unauthenticated).

**Change OTP behavior / scan limits**
- OTP expiry & scan rate limits are centralized in `lib/utils/constants.ts`
  (`GAME_CONSTANTS`) and surfaced in `/mentor/settings` via `/api/v1/admin/runtime`.
- Real rate limiting requires Upstash Redis (local mock is pass-through).

**Regenerate the Prisma client after schema changes**
`npm run db:generate`, then restart the dev server.

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `P1001`/connection timeout | check `DATABASE_URL`; for Neon ensure `?sslmode=require` |
| Logged in but sent to `/login` repeatedly | tokens expired: refresh failed; ensure `JWT_SECRET` **and** `JWT_REFRESH_SECRET` are stable across restarts |
| Mentors can't access admin APIs (403) | the user's role is not `MENTOR`; seed/login the `+212600000001` account (or update the role in `db:studio`) |
| OTP never validates | confirm `OTP_MOCK=true` and use code `000000` (mock is disabled in production) |
| QR "no indexes" when generating | generation needs an **active round** on the index; seed provides one, or create/start a round first |
| Redis features not enforced (rate limit, token reuse) | expected in local dev — `LocalRedisMock` is pass-through; set a real Upstash URL |
| New styles not applied | Tailwind v4 scans source; the `stitch_.../ `folder is excluded via `@source not` in `globals.css` intentionally |
| `tsc`/lint clean but a page crashes | rerender loop in `useEffect` — keep API calls behind the `react-hooks/set-state-in-effect` pattern used on the dashboard |

---

## Deployment notes

- **Database:** provision Neon (or any Postgres) and set `DATABASE_URL`.
- **Redis:** create an Upstash instance; set `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` (optionally add a rate-limit allowance). Upstash REST API
  works server-side on Vercel.
- **Env:** set `JWT_SECRET`, `JWT_REFRESH_SECRET`, `HMAC_SECRET` as deploy secrets.
  Keep `OTP_MOCK` off in production unless using a throwaway test env.
- **SMS:** set Twilio creds for real OTP delivery; without them keep `OTP_MOCK=true`
  (rejected in `production`, so use a non-prod `NODE_ENV` for smoke tests).
- **Build & run:** `npm run build` then `npm run start`. Runtime requirements are limited
  to Next.js + your Postgres/Redis — no extra services needed for the core loop.
