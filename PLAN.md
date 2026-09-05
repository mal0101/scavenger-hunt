# SCAVENGER HUNT — FULL IMPLEMENTATION PLAN

> **Status:** Locked & Ready for Execution
> **Last Updated:** August 26, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Complete File Structure](#3-complete-file-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Game Engine & State Machine](#6-game-engine--state-machine)
7. [QR Code System](#7-qr-code-system)
8. [Real-Time System (SSE + Redis Pub/Sub)](#8-real-time-system-sse--redis-pubsub)
9. [Frontend Architecture](#9-frontend-architecture)
10. [API Endpoints](#10-api-endpoints)
11. [Security Architecture](#11-security-architecture)
12. [Dependencies](#12-dependencies)
13. [Deployment Configuration](#13-deployment-configuration)
14. [Implementation Phases](#14-implementation-phases)
15. [Risks & Mitigations](#15-risks--mitigations)

---

## 1. Architecture Overview

**Single Next.js 14+ App Router monolith** deployed on Vercel with two shell experiences:

```
┌──────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (Vercel)                  │
│                                                          │
│  ┌─────────────────┐          ┌──────────────────────┐   │
│  │  STUDENT SHELL   │          │   MENTOR SHELL        │   │
│  │  (player routes) │          │   (admin routes)      │   │
│  │                  │          │                       │   │
│  │  /dock           │          │   /mentor/dashboard   │   │
│  │  /scan           │          │   /mentor/games       │   │
│  │  /leaderboard    │          │   /mentor/indexes     │   │
│  │  /vault          │          │   /mentor/teams       │   │
│  │  /logs           │          │   /mentor/settings    │   │
│  └────────┬─────────┘          └──────────┬────────────┘   │
│           │                               │                │
│           └───────────┬───────────────────┘                │
│                       │                                    │
│              ┌────────▼────────┐                           │
│              │  API ROUTES     │                           │
│              │  /api/v1/*      │                           │
│              └────────┬────────┘                           │
│                       │                                    │
│         ┌─────────────┼──────────────┐                    │
│         │             │              │                     │
│  ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐             │
│  │   Neon PG   │ │ Upstash │ │  SSE Layer  │             │
│  │ (Postgres)  │ │ (Redis) │ │ (Real-time) │             │
│  └─────────────┘ └─────────┘ └─────────────┘             │
└──────────────────────────────────────────────────────────┘
```

**Key Architecture Decisions:**
- **Framework:** Next.js 14+ with App Router (React 18+, TypeScript 5+)
- **ORM:** Prisma with Neon serverless driver
- **Cache/Leaderboard:** Upstash Redis with `@upstash/redis` REST client
- **Auth:** JWT-based with mock OTP (Twilio-ready via env vars)
- **Real-time:** Server-Sent Events (SSE) via Upstash Redis Pub/Sub — Vercel-compatible
- **QR Scanning:** `html5-qrcode` browser library (no native camera permission issues)
- **QR Generation:** `qrcode` npm package with HMAC-SHA256 signed payloads
- **Styling:** Tailwind CSS with custom design tokens from `design.md`
- **State Management:** Zustand (lightweight, SSR-compatible)
- **PWA:** `next-pwa` for installable mobile-first experience
- **Testing:** Vitest + Playwright

---

## 2. Technology Stack

| Layer / Domain | Technology | Rationale |
|---|---|---|
| Frontend (Mobile + Mentor) | Next.js 14+ App Router | Single app with route groups for both shells; Vercel-native deployment |
| Styling | Tailwind CSS | Design token integration from `design.md`; utility-first |
| ORM | Prisma | Type-safe DB access, migrations, Neon serverless driver compatibility |
| Primary Database | Neon Serverless PostgreSQL | ACID-compliant, serverless, free tier, Vercel-optimized |
| In-Memory Cache | Upstash Redis | Serverless Redis, ZSET for leaderboards, Pub/Sub for SSE, free tier |
| Auth | jose (JWT) + mock OTP | Lightweight JWT library; mock mode with Twilio plug-in ready |
| QR Generation | qrcode (npm) | Server-side QR image generation with HMAC signatures |
| QR Scanning | html5-qrcode | Browser-based camera QR scanning; cross-platform |
| Real-Time | SSE + Redis Pub/Sub | Vercel-compatible (no WebSocket server needed) |
| State Management | Zustand | Lightweight, SSR-compatible, no boilerplate |
| Validation | Zod | Schema validation for API inputs + TypeScript type inference |
| PWA | next-pwa | Service worker, manifest, installable on mobile |
| Deployment | Vercel | Zero-config Next.js hosting, serverless functions, edge middleware |

---

## 3. Complete File Structure

```
scavenger-hunt/
│
├── 📁 app/                              # Next.js App Router
│   ├── layout.tsx                       # Root layout: fonts, providers, metadata
│   ├── page.tsx                         # Landing → redirect to /dock or /login
│   ├── not-found.tsx                    # Custom 404 (steampunk styled)
│   ├── error.tsx                        # Global error boundary
│   │
│   ├── 📁 (auth)/                       # Auth route group (no shell)
│   │   ├── layout.tsx                   # Auth layout (centered, no nav)
│   │   ├── login/page.tsx              # Phone number entry + send OTP
│   │   ├── verify/page.tsx             # OTP verification (6-digit input)
│   │   └── role-select/page.tsx        # Choose Player or Mentor (first login)
│   │
│   ├── 📁 (player)/                     # Student shell group
│   │   ├── layout.tsx                   # Player layout: top bar + bottom nav
│   │   ├── dock/page.tsx               # Dashboard home — current objective, descent map
│   │   ├── scan/page.tsx               # QR scanner — camera viewfinder
│   │   ├── scan-result/page.tsx        # Post-scan result (enigma/trap split)
│   │   ├── leaderboard/page.tsx        # Live team rankings
│   │   ├── vault/page.tsx              # Compass + data cylinders + collectibles
│   │   ├── logs/page.tsx               # Scan history log
│   │   ├── enigma/page.tsx             # Interactive puzzle screen
│   │   └── trap/page.tsx               # Trap/challenge screen
│   │
│   ├── 📁 (mentor)/                     # Admin shell group
│   │   ├── layout.tsx                   # Mentor layout: sidebar + header
│   │   ├── mentor/dashboard/page.tsx   # Overview — stats, active players, alerts
│   │   ├── mentor/games/page.tsx       # Game CRUD — create, configure, state control
│   │   ├── mentor/games/[id]/page.tsx  # Single game detail + live controls
│   │   ├── mentor/indexes/page.tsx     # QR index management — generate, export
│   │   ├── mentor/teams/page.tsx       # Team telemetry — map, scores, status
│   │   └── mentor/settings/page.tsx    # Platform settings
│   │
│   └── 📁 api/                          # API Route Handlers
│       └── 📁 v1/
│           ├── 📁 auth/
│           │   ├── send-otp/route.ts   # POST: dispatch OTP
│           │   ├── verify-otp/route.ts # POST: verify OTP → JWT
│           │   └── refresh/route.ts    # POST: refresh access token
│           ├── 📁 players/
│           │   ├── me/route.ts         # GET/PUT: player profile
│           │   └── me/team/route.ts    # POST: create/join team
│           ├── 📁 games/
│           │   ├── active/route.ts     # GET: current active game
│           │   └── [id]/
│           │       ├── leaderboard/route.ts  # GET: live leaderboard
│           │       └── scan/route.ts   # POST: submit QR scan
│           ├── 📁 admin/
│           │   ├── games/route.ts      # GET/POST: list/create games
│           │   ├── games/[id]/
│           │   │   ├── route.ts        # GET/PUT/DELETE: single game
│           │   │   └── state/route.ts  # POST: advance game state
│           │   ├── indexes/route.ts    # GET/POST: list/create indexes
│           │   ├── indexes/[id]/route.ts  # GET/PUT/DELETE: single index
│           │   ├── indexes/generate/route.ts  # POST: generate QR codes
│           │   └── teams/route.ts      # GET: all teams telemetry
│           └── 📁 sse/
│               ├── leaderboard/[gameId]/route.ts  # GET: SSE leaderboard stream
│               └── timer/[gameId]/route.ts        # GET: SSE timer sync
│
├── 📁 components/
│   ├── 📁 ui/                           # Reusable primitive components
│   │   ├── button.tsx                   # Steampunk button (primary, danger, ghost)
│   │   ├── card.tsx                     # Card with arch-top, brass border variants
│   │   ├── input.tsx                    # Recessed slot-style input (JetBrains Mono)
│   │   ├── modal.tsx                    # Glass-panel modal overlay
│   │   ├── badge.tsx                    # Brass plaque badge/chip
│   │   ├── toggle.tsx                   # Hydraulic relay toggle switch
│   │   ├── gauge.tsx                    # Liquid-fill gauge visualization
│   │   ├── countdown-timer.tsx          # Large countdown display
│   │   ├── progress-bar.tsx             # Liquid-amber progress bar
│   │   ├── rivet-divider.tsx            # Riveted line divider
│   │   ├── data-cylinder.tsx            # Collectible cylinder slot
│   │   ├── toast.tsx                    # Notification toast
│   │   └── skeleton.tsx                 # Loading skeleton
│   │
│   ├── 📁 layout/                       # Shell and navigation
│   │   ├── player-shell.tsx             # Full player mobile shell
│   │   ├── bottom-nav.tsx               # Bottom nav (DOCK/LOGS/SCAN/VAULT)
│   │   ├── top-bar.tsx                  # Fixed top bar with logo + scan CTA
│   │   ├── mentor-shell.tsx             # Full mentor desktop shell
│   │   ├── mentor-sidebar.tsx           # Sidebar navigation
│   │   ├── mentor-header.tsx            # Top header bar
│   │   └── responsive-nav.tsx           # Adaptive nav (mobile ↔ desktop)
│   │
│   ├── 📁 game/                         # Game-specific components
│   │   ├── qr-scanner.tsx               # Camera QR viewfinder (html5-qrcode)
│   │   ├── descent-map.tsx              # Vertical progress map
│   │   ├── objective-banner.tsx         # Current objective display
│   │   ├── enigma-cylinder.tsx          # Rotating puzzle cylinder
│   │   ├── trap-panel.tsx               # Emergency trap screen
│   │   ├── scan-result-split.tsx        # Enigma Unlocked vs Trap Triggered
│   │   ├── leaderboard-table.tsx        # Ranked team list
│   │   ├── elimination-line.tsx         # Visual elimination threshold
│   │   ├── team-card.tsx                # Team info with score
│   │   ├── hydraulic-controls.tsx       # Toggle switches grid
│   │   └── trivia-bypass.tsx            # Trivia question for trap bypass
│   │
│   ├── 📁 dashboard/                    # Mentor admin components
│   │   ├── summary-bar.tsx              # Stats overview cards
│   │   ├── player-table.tsx             # Sortable player management grid
│   │   ├── index-manager.tsx            # QR index CRUD table
│   │   ├── game-controls.tsx            # State machine button panel
│   │   ├── game-config-form.tsx         # Game creation/edit form
│   │   └── audit-log.tsx                # Scan event audit trail
│   │
│   └── 📁 steampunk/                    # Decorative/branding components
│       ├── gear-decoration.tsx          # Animated spinning gear
│       ├── pipe-structure.tsx           # Side pipe decoration (desktop)
│       ├── arch-panel.tsx               # Moroccan arch-topped panel
│       ├── porthole.tsx                 # Submarine porthole graphic
│       ├── noise-overlay.tsx            # Background noise texture
│       ├── rivet.tsx                    # Corner rivet accent
│       └── brand-logo.tsx               # ADE/Aether Compass logo
│
├── 📁 lib/                              # Core logic and utilities
│   ├── 📁 db/
│   │   ├── postgres.ts                  # Neon PostgreSQL connection (Prisma)
│   │   ├── redis.ts                     # Upstash Redis client
│   │   └── pubsub.ts                    # Redis Pub/Sub for SSE
│   ├── 📁 auth/
│   │   ├── jwt.ts                       # JWT sign/verify (access + refresh)
│   │   ├── otp.ts                       # OTP generation + mock verification
│   │   ├── session.ts                   # Session management
│   │   └── cookies.ts                   # Secure cookie helpers
│   ├── 📁 game/
│   │   ├── engine.ts                    # Game state machine (FSM)
│   │   ├── scoring.ts                   # Score calculation + time multiplier
│   │   ├── elimination.ts              # Bottom percentile elimination
│   │   └── team.ts                      # Team formation + invite codes
│   ├── 📁 qr/
│   │   ├── generator.ts                 # QR code image generation
│   │   ├── validator.ts                 # HMAC-SHA256 QR validation
│   │   └── payload.ts                   # QR payload encode/decode
│   ├── 📁 sse/
│   │   ├── leaderboard-stream.ts        # SSE leaderboard broadcast
│   │   └── timer-stream.ts             # SSE timer sync broadcast
│   ├── 📁 sms/
│   │   └── provider.ts                  # SMS abstraction (mock + Twilio)
│   ├── 📁 types/
│   │   ├── game.ts                      # Game, Round, Stage types
│   │   ├── user.ts                      # User, Player, Mentor types
│   │   ├── api.ts                       # API request/response types
│   │   └── qr.ts                        # QR payload types
│   └── 📁 utils/
│       ├── rate-limiter.ts              # Upstash sliding-window rate limiter
│       ├── crypto.ts                    # HMAC, hash, UUID utilities
│       ├── validation.ts               # Zod schema validation helpers
│       ├── format.ts                    # Date/number formatting
│       └── constants.ts                 # Game constants, timeouts, limits
│
├── 📁 hooks/                            # React hooks
│   ├── use-leaderboard.ts               # SSE leaderboard subscription
│   ├── use-timer.ts                     # Game countdown timer
│   ├── use-qr-scanner.ts               # Camera QR scanning
│   ├── use-auth.ts                      # Auth state + token management
│   ├── use-game-state.ts               # Current game state
│   └── use-media-query.ts              # Responsive breakpoint detection
│
├── 📁 stores/                           # Zustand state stores
│   ├── auth-store.ts                    # Auth state (user, token, role)
│   ├── game-store.ts                    # Game state + current stage
│   └── leaderboard-store.ts            # Live leaderboard data
│
├── 📁 prisma/
│   ├── schema.prisma                    # Database schema (all tables)
│   └── seed.ts                          # Seed data for development
│
├── 📁 styles/
│   └── globals.css                      # Global CSS: Tailwind, CSS variables,
│                                        #   noise textures, animations, utilities
│
├── 📁 public/
│   ├── manifest.json                    # PWA manifest
│   ├── sw.js                            # Service worker
│   ├── favicon.ico                      # Favicon
│   ├── icons/                           # PWA icons (192, 512)
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── images/                          # Static images
│       ├── logo.png                     # Brand logo
│       └── logo-dark.png
│
├── middleware.ts                         # Next.js middleware: auth guard, role routing
├── tailwind.config.ts                   # Tailwind config with Amber Mariner tokens
├── next.config.ts                       # Next.js config (PWA, images, headers)
├── postcss.config.js                    # PostCSS (Tailwind + autoprefixer)
├── tsconfig.json                        # TypeScript config
├── vercel.json                          # Vercel deployment config
├── .env.example                         # Environment variable template
├── .env.local                           # Local environment variables (gitignored)
├── .gitignore                           # Updated for Node.js + Next.js
├── package.json                         # Dependencies + scripts
├── README.md                            # Project documentation
│
├── 📄 design.md                         # (existing) Design system spec
├── 📄 scavenger_hunt.md                 # (existing) Technical specification
└── 📁 stitch_hydraulic_echoes_of_casablanca/  # (existing) HTML prototypes
```

---

## 4. Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── ENUMS ──────────────────────────────────────────────

enum UserRole {
  PLAYER
  MENTOR
}

enum GameStatus {
  PENDING
  ACTIVE
  ELIMINATING
  FINISHED
}

enum PlayerStatus {
  ACTIVE
  ELIMINATED
}

// ── TABLES ─────────────────────────────────────────────

model User {
  id            String    @id @default(uuid())
  phone_number  String    @unique
  nickname      String?
  role          UserRole  @default(PLAYER)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  player        Player?

  @@map("users")
}

model OTP {
  id            String    @id @default(uuid())
  phone_number  String
  code          String
  expires_at    DateTime
  used          Boolean   @default(false)
  created_at    DateTime  @default(now())

  @@index([phone_number, used])
  @@map("otps")
}

model Game {
  id              String      @id @default(uuid())
  title           String
  description     String?
  status          GameStatus  @default(PENDING)
  max_rounds      Int         @default(3)
  round_duration  Int         @default(1800)
  elimination_pct Float       @default(0.2)
  created_by      String
  started_at      DateTime?
  finished_at     DateTime?
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt

  rounds          Round[]
  players         Player[]

  @@map("games")
}

model Round {
  id              String    @id @default(uuid())
  game_id         String
  round_number    Int
  score_threshold Int       @default(0)
  status          String    @default("locked")
  started_at      DateTime?
  ended_at        DateTime?

  game            Game      @relation(fields: [game_id], references: [id])
  indexes         Index[]

  @@unique([game_id, round_number])
  @@map("rounds")
}

model Index {
  id              String    @id @default(uuid())
  round_id        String
  label           String
  description     String?
  points          Int       @default(25)
  location_name   String?
  location_lat    Float?
  location_lng    Float?
  qr_signature    String
  created_at      DateTime  @default(now())

  round           Round     @relation(fields: [round_id], references: [id])
  scans           Scan[]

  @@map("indexes")
}

model Player {
  id            String        @id @default(uuid())
  user_id       String        @unique
  game_id       String
  team_id       String?
  total_score   Int           @default(0)
  rank          Int?
  status        PlayerStatus  @default(ACTIVE)
  joined_at     DateTime      @default(now())

  user          User          @relation(fields: [user_id], references: [id])
  game          Game          @relation(fields: [game_id], references: [id])
  team          Team?         @relation(fields: [team_id], references: [id])
  scans         Scan[]

  @@map("players")
}

model Team {
  id            String    @id @default(uuid())
  name          String
  invite_code   String    @unique
  game_id       String
  total_score   Int       @default(0)
  created_at    DateTime  @default(now())

  game          Game      @relation(fields: [game_id], references: [id])
  players       Player[]

  @@map("teams")
}

model Scan {
  id            String    @id @default(uuid())
  player_id     String
  index_id      String
  points_earned Int
  scanned_at    DateTime  @default(now())
  gps_lat       Float?
  gps_lng       Float?

  player        Player    @relation(fields: [player_id], references: [id])
  index         Index     @relation(fields: [index_id], references: [id])

  @@unique([player_id, index_id])
  @@map("scans")
}
```

---

## 5. Authentication System

### Flow:
```
Phone Input → POST /api/v1/auth/send-otp → OTP generated (stored in DB)
                                          → Mock: always "000000"
                                          → Real: Twilio SMS dispatch

OTP Input   → POST /api/v1/auth/verify-otp → Validate OTP + expiry
                                            → Create/find User
                                            → Issue JWT (access + refresh)
                                            → Set HTTP-only cookie (refresh)
                                            → Return access token

Subsequent  → Authorization: Bearer <access_token>
Requests      → middleware.ts validates JWT
              → Refresh token rotation on expiry
```

### Security:
- Access token: 15-minute expiry, signed with `JWT_SECRET`
- Refresh token: 7-day expiry, HTTP-only secure cookie, rotated on use
- OTP: 6-digit numeric, 5-minute TTL, 1 request per 60s per phone
- Rate limiting: 5 OTP requests per phone per hour (Upstash sliding window)
- Mock mode: When `OTP_MOCK=true`, code "000000" always works

---

## 6. Game Engine & State Machine

### State Transitions:
```
PENDING ──[mentor starts]──► ACTIVE ──[round timer expires]──► ELIMINATING
   ▲                         │                                      │
   │                         │ [scans validated]                    │ [bottom % eliminated]
   │                         │ [scores calculated]                  │
   │                         ▼                                      ▼
   │                    STAGE_IN_PROGRESS                   ┌───────┴───────┐
   │                         │                              │               │
   │                         │ [teams > 1]                  │  teams = 1    │
   │                         ▼                              │               │
   │                    Next Round ◄────────────────────────┘               │
   │                                                                       │
   └───────────────────────────────────────────────────────────── FINISHED
```

### Scoring Algorithm:
```
scan_score = base_points × time_multiplier

time_multiplier = 1 + (remaining_time / total_time) × 0.5
// Earlier scans earn up to 1.5x bonus

total_score = sum(scan_scores for all valid scans in round)
```

### Elimination:
```
elimination_threshold = sorted_scores[floor(num_teams × elimination_pct)]
// Bottom 20% eliminated after each round
// If only 1 team remains → FINISHED (winner declared)
```

---

## 7. QR Code System

### Generation (Mentor side):
```
Payload = {
  index_id: UUID,
  game_id: UUID,
  round_id: UUID,
  timestamp: ISO8601,
  signature: HMAC-SHA256(HMAC_SECRET, index_id + game_id + timestamp)
}

QR Image = qrcode library → SVG/PNG → downloadable for physical printing
```

### Validation (Student scan):
```
1. Decode QR → extract payload
2. Verify HMAC signature (prevent forgery)
3. Check timestamp freshness (prevent replay)
4. Check player hasn't already scanned this index (unique constraint)
5. Check game is ACTIVE and correct round
6. Award points → update player total → update Redis leaderboard → broadcast SSE
```

### Anti-Cheat:
- HMAC signature prevents manual URL construction
- One-scan-per-index-per-player enforced at DB level (unique constraint)
- Timestamp validation prevents replay attacks
- Optional GPS coordinates for movement auditing
- Rate limiting: max 10 scans per minute per player

---

## 8. Real-Time System (SSE + Redis Pub/Sub)

Since Vercel doesn't support persistent WebSocket servers, we use **Server-Sent Events (SSE)** with **Upstash Redis Pub/Sub** as the message bus:

```
┌─────────┐    scan     ┌──────────┐   publish    ┌──────────┐
│ Student  │───────────►│ API Route │─────────────►│ Upstash  │
│ scans QR │            │ (Vercel)  │              │ Redis    │
└─────────┘             └──────────┘              └────┬─────┘
                                                       │ subscribe
                                              ┌────────▼────────┐
                                              │  SSE Endpoint   │
                                              │  (Vercel)       │
                                              └────────┬────────┘
                                                       │ event stream
                                    ┌──────────────────┼──────────────────┐
                                    │                  │                  │
                               ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
                               │Student A│       │Student B│       │ Mentor  │
                               │(browser)│       │(browser)│       │(browser)│
                               └─────────┘       └─────────┘       └─────────┘
```

### SSE Events:
- `leaderboard:update` — New rankings after any scan
- `game:timer_sync` — Server-authoritative countdown (every 1s)
- `game:state_changed` — PENDING → ACTIVE → ELIMINATING → FINISHED
- `team:eliminated` — Targeted elimination notification
- `player:scan_confirmed` — Confirmation of successful scan

### Implementation:
- `/api/v1/sse/leaderboard/[gameId]` — Returns `ReadableStream` (Next.js App Router streaming)
- Client subscribes via `EventSource` or custom `useSSE` hook
- Redis channel per game: `game:{gameId}:events`

---

## 9. Frontend Architecture

### Design Token Integration (from design.md):

```ts
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        surface: '#1c110c',
        'surface-dim': '#1c110c',
        'surface-bright': '#453630',
        'surface-container-lowest': '#160c07',
        'surface-container-low': '#251913',
        'surface-container': '#291d17',
        'surface-container-high': '#342721',
        'surface-container-highest': '#40322c',
        'on-surface': '#f5ded5',
        'on-surface-variant': '#dbc2b0',
        'inverse-surface': '#f5ded5',
        'inverse-on-surface': '#3b2d27',
        outline: '#a38c7c',
        'outline-variant': '#554336',
        'surface-tint': '#ffb77d',
        primary: '#ffb77d',
        'on-primary': '#4d2600',
        'primary-container': '#d97707',
        'on-primary-container': '#432100',
        'inverse-primary': '#904d00',
        secondary: '#f5ba92',
        'on-secondary': '#4b270a',
        'secondary-container': '#683f20',
        'on-secondary-container': '#e5ac85',
        tertiary: '#e1c0ad',
        'on-tertiary': '#402c1f',
        'tertiary-container': '#a88b7a',
        'on-tertiary-container': '#392519',
        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
        background: '#1c110c',
        'on-background': '#f5ded5',
      },
      fontFamily: {
        headline: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        label: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        unit: '8px',
        gutter: '24px',
        'margin-mobile': '20px',
        'margin-desktop': '64px',
        'panel-gap': '48px',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
    },
  },
}
```

### CSS Variables (globals.css):
```css
:root {
  --surface: #1c110c;
  --primary: #ffb77d;
  --primary-container: #d97707;
  /* Full token set from design.md */

  /* Steampunk effects */
  --noise-opacity: 0.05;
  --brass-glow: inset 0 0 20px rgba(255, 183, 125, 0.1);
  --amber-shadow: 0 0 15px rgba(217, 119, 7, 0.5);
}

/* ── Steampunk Utility Classes ── */

.brass-glow {
  box-shadow: var(--brass-glow);
}

.glass-panel {
  backdrop-filter: blur(12px);
  background: rgba(37, 25, 19, 0.6);
  border-top: 2px solid var(--primary-container);
  border-left: 1px solid #554336;
  border-right: 1px solid #554336;
  border-bottom: 1px solid #554336;
  box-shadow: inset 0 0 20px rgba(217, 119, 7, 0.05);
}

.arch-top {
  border-top-left-radius: 40px;
  border-top-right-radius: 40px;
}

.gear-spin {
  animation: spin 10s linear infinite;
}

.flicker-alert {
  animation: flicker 2s infinite;
}

.shimmer-bg {
  background: linear-gradient(90deg, #d97707 0%, #ffb77d 50%, #d97707 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}

.vignette-danger {
  box-shadow: inset 0 0 100px rgba(255, 180, 171, 0.2);
  pointer-events: none;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
  20%, 22%, 24%, 55% { opacity: 0.3; }
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@keyframes pulse-danger {
  0% { box-shadow: inset 0 0 20px rgba(255, 0, 10, 0.2); }
  50% { box-shadow: inset 0 0 60px rgba(255, 0, 10, 0.6); }
  100% { box-shadow: inset 0 0 20px rgba(255, 0, 10, 0.2); }
}

@keyframes pulse-border {
  0% { border-color: rgba(255, 183, 125, 0.3); }
  50% { border-color: rgba(255, 183, 125, 1); }
  100% { border-color: rgba(255, 183, 125, 0.3); }
}

@keyframes glitch-anim {
  0% { clip: rect(41px, 9999px, 86px, 0); }
  20% { clip: rect(6px, 9999px, 8px, 0); }
  40% { clip: rect(15px, 9999px, 90px, 0); }
  60% { clip: rect(100px, 9999px, 120px, 0); }
  80% { clip: rect(2px, 9999px, 45px, 0); }
  100% { clip: rect(33px, 9999px, 88px, 0); }
}
```

### Component Styling Approach:
- Every component uses Tailwind classes referencing the design tokens
- Custom `@apply` utilities in `globals.css` for recurring steampunk patterns
- Noise texture as inline SVG data URI in body background
- Glass-panel effects via `backdrop-filter` + semi-transparent backgrounds
- "Riveted" corners using small absolute-positioned pseudo-elements
- Liquid-fill gauges using CSS gradients + animation
- Arch-top panels using `border-radius` (40px top corners)

### PWA Configuration:
```json
// public/manifest.json
{
  "name": "Aether Compass - Scavenger Hunt",
  "short_name": "Aether Compass",
  "description": "Gamified QR Code Treasure Hunt Platform — ENSAM Casablanca",
  "start_url": "/dock",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1c110c",
  "theme_color": "#d97707",
  "categories": ["games", "education"],
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 10. API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/v1/auth/send-otp` | No | — | Send OTP to phone |
| POST | `/api/v1/auth/verify-otp` | No | — | Verify OTP, return JWT |
| POST | `/api/v1/auth/refresh` | Cookie | — | Refresh access token |
| GET | `/api/v1/players/me` | JWT | Player | Get current profile |
| PUT | `/api/v1/players/me` | JWT | Player | Update nickname/avatar |
| POST | `/api/v1/players/me/team` | JWT | Player | Create/join team |
| GET | `/api/v1/games/active` | JWT | Player | Get active game + round |
| GET | `/api/v1/games/:id/leaderboard` | JWT | Player | Get leaderboard |
| POST | `/api/v1/games/:id/scan` | JWT | Player | Submit QR scan |
| GET | `/api/v1/admin/games` | JWT | Mentor | List all games |
| POST | `/api/v1/admin/games` | JWT | Mentor | Create new game |
| GET | `/api/v1/admin/games/:id` | JWT | Mentor | Get game detail |
| PUT | `/api/v1/admin/games/:id` | JWT | Mentor | Update game config |
| DELETE | `/api/v1/admin/games/:id` | JWT | Mentor | Delete game |
| POST | `/api/v1/admin/games/:id/state` | JWT | Mentor | Advance game state |
| GET | `/api/v1/admin/games/:id/indexes` | JWT | Mentor | List indexes for game |
| POST | `/api/v1/admin/games/:id/indexes` | JWT | Mentor | Create index |
| PUT | `/api/v1/admin/indexes/:id` | JWT | Mentor | Update index |
| DELETE | `/api/v1/admin/indexes/:id` | JWT | Mentor | Delete index |
| POST | `/api/v1/admin/indexes/:id/qr` | JWT | Mentor | Generate QR code image |
| GET | `/api/v1/admin/games/:id/teams` | JWT | Mentor | All teams telemetry |
| GET | `/api/v1/sse/leaderboard/:gameId` | JWT | Any | SSE leaderboard stream |
| GET | `/api/v1/sse/timer/:gameId` | JWT | Any | SSE timer sync |

### Standard Response Envelope:
```json
{
  "success": true,
  "message": "Index scanned successfully",
  "data": { ... },
  "timestamp": "2026-08-25T14:23:15Z"
}
```

### Error Response Envelope:
```json
{
  "success": false,
  "message": "Invalid QR code signature",
  "error": "QR_VALIDATION_FAILED",
  "timestamp": "2026-08-25T14:23:15Z"
}
```

---

## 11. Security Architecture

| Control | Implementation |
|---------|---------------|
| **Auth** | JWT (15min access + 7d refresh), HTTP-only cookies for refresh |
| **RBAC** | Middleware checks `role` claim; `PLAYER` can't hit `/admin/*` routes |
| **Rate Limiting** | Upstash sliding window: 100 req/min general, 5 OTP/hr/phone, 10 scans/min/player |
| **QR Anti-Cheat** | HMAC-SHA256 signatures, one-use constraint, timestamp freshness |
| **SQL Injection** | Prisma ORM parameterized queries (no raw SQL) |
| **XSS** | React auto-escaping + CSP headers in `next.config.ts` |
| **CORS** | Configured via `CORS_ORIGINS` env var |
| **Headers** | `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` via `next.config.ts` |
| **Secrets** | All secrets in env vars, never committed. `.env.example` with placeholder values |
| **Input Validation** | Zod schemas on all API inputs |

---

## 12. Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.20.0",
    "@upstash/redis": "^1.34.0",
    "@upstash/ratelimit": "^2.0.0",
    "zustand": "^4.5.0",
    "zod": "^3.23.0",
    "jose": "^5.6.0",
    "qrcode": "^1.5.4",
    "html5-qrcode": "^2.3.0",
    "next-pwa": "^5.6.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/qrcode": "^1.5.5",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.1.0",
    "eslint": "^9.10.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

---

## 13. Deployment Configuration

### Vercel (`vercel.json`):
```json
{
  "framework": "nextjs",
  "regions": ["cdg1"],
  "functions": {
    "api/v1/sse/**": { "maxDuration": 300 },
    "api/v1/admin/**": { "maxDuration": 30 }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

### Environment Variables (`.env.example`):
```bash
# ── Database ──────────────────────────
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# ── Redis ─────────────────────────────
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."

# ── Auth ──────────────────────────────
JWT_SECRET="generate-a-64-char-random-string"
JWT_REFRESH_SECRET="generate-another-64-char-random-string"
JWT_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# ── QR Code ───────────────────────────
HMAC_SECRET="generate-a-64-char-random-string"

# ── SMS / Twilio (optional) ───────────
OTP_MOCK="true"
TWILIO_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE=""

# ── App ───────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 14. Implementation Phases

### Phase 1: Foundation (Scaffold + Auth)
1. Initialize Next.js project with TypeScript + Tailwind
2. Configure Tailwind with Amber Mariner design tokens
3. Set up Prisma schema + Neon connection
4. Set up Upstash Redis client
5. Implement JWT auth (sign/verify/refresh)
6. Build OTP flow (mock mode)
7. Build auth pages (login, verify, role-select)
8. Implement Next.js middleware (auth guards + role routing)
9. Set up `.env.example` and env validation

### Phase 2: Player Experience (Mobile Shell + Core Screens)
1. Build player layout shell (top bar + bottom nav)
2. Build all steampunk UI primitives (button, card, gauge, toggle, etc.)
3. Build decorative components (gears, pipes, arch panels, portholes)
4. Build dock/home page (objective banner, descent map, data cylinders)
5. Build QR scanner page (camera viewfinder)
6. Build scan result page (enigma unlocked vs trap triggered split)
7. Build leaderboard page (ranked team list with elimination line)
8. Build vault page (compass + collectibles)
9. Build logs page (scan history)
10. Build enigma/puzzle page
11. Build trap/challenge page
12. Implement PWA manifest + service worker

### Phase 3: Game Engine + QR System
1. Implement game state machine (FSM)
2. Implement scoring algorithm + time multiplier
3. Implement elimination logic
4. Implement QR HMAC generation + validation
5. Build QR scan API endpoint
6. Build game API endpoints (active game, leaderboard)
7. Build team formation (create/join with invite code)
8. Implement rate limiting on scan endpoints

### Phase 4: Real-Time (SSE + Redis)
1. Set up Redis Pub/Sub channels
2. Build SSE leaderboard endpoint
3. Build SSE timer sync endpoint
4. Implement `useLeaderboard` hook (EventSource)
5. Implement `useTimer` hook (server-synced countdown)
6. Wire real-time updates to leaderboard page + dock page

### Phase 5: Mentor Dashboard
1. Build mentor layout shell (sidebar + header)
2. Build dashboard overview (stats summary bar)
3. Build game management (CRUD + state controls)
4. Build index management (QR code generation + export)
5. Build team monitoring (telemetry table)
6. Build game config form (create/edit games)
7. Implement state advancement controls (start, eliminate, finish)

### Phase 6: Polish + Deploy
1. Add all animations (gear spin, flicker, shimmer, pulse)
2. Add noise texture backgrounds
3. Add loading skeletons for all async content
4. Add error boundaries + toast notifications
5. Responsive testing (mobile ↔ desktop)
6. Set up Vercel deployment
7. Configure custom domain (if available)
8. Final security audit
9. Performance optimization (Lighthouse audit)

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Vercel serverless cold starts | Use Edge Runtime for auth middleware; keep functions warm via SSE |
| SSE connection limits | Upstash Redis Pub/Sub handles fan-out; SSE auto-reconnects on client |
| Camera QR on iOS Safari | `html5-qrcode` handles permission prompts; fallback to manual code entry |
| Concurrent scan thundering herd | Upstash rate limiter + Redis atomic operations for leaderboard |
| Database connection pooling | Neon's serverless driver uses HTTP, not TCP — no pool exhaustion |
| JWT secret compromise | Use separate secrets for access/refresh; short expiry; rotation |
| 200+ concurrent players | Redis ZSET leaderboard is O(log(N)+M); PostgreSQL handles writes with unique constraints |

---

*This plan is the source of truth for the entire implementation. Every file, every schema, every API endpoint, every security control, every component, and every implementation phase — mapped out with zero ambiguity.*
