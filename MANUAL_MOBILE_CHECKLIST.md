# Manual mobile checklist

The automated integration suite covers the API; this checklist covers what only
a real device/browser can validate. Run against `npm run dev` (mock OTP: code `000000`).

Progress: mark each item as you go. Anything failing here is a **release blocker**.

## 1. Setup (local)

- [ ] Postgres running, migration applied, seeded (`games.status = ACTIVE`)
- [ ] `npm run dev` on a LAN-visible host (phone must reach your machine)
- [ ] App opened on phone; layout renders, no JS console errors
- [ ] Desktop browser: `/` routes to `/dock` for a PLAYER or user-aware home for MENTOR
- [ ] Unauthenticated deep links (`/dock`, `/scan`, mentor URLs) redirect to `/login` with a `redirect` param

## 2. Auth

- [ ] Enter phone → receives OTP → enters 6-digit code (mock: `000000`) → lands in app
- [ ] Invalid phone / malformed input is blocked client-side (nice error, no dead button)
- [ ] Wrong OTP shows "invalid or expired code"; 5 wrong codes lock the code out
- [ ] Refresh the page mid-session → still signed in (refresh-token rotation via cookies)
- [ ] Logout → returns to `/login`; back/forward navigation cannot resurrect the session
- [ ] DevTools: auth cookies are `HttpOnly`, `SameSite=Lax`

## 3. Onboarding & teams

- [ ] First sign-in auto-creates a player profile bound to the active game
- [ ] Profile screen shows nickname (editable, max 50 chars) and zero balance
- [ ] Can create a team; generated invite code is shown
- [ ] Second device joins via invite code; member list shows both players
- [ ] Team with 4 members rejects a 5th with "team is full"
- [ ] A team cursed to 100 teams cannot be created (tested via fixture game)

## 4. Scanning (real camera on phone)

- [ ] `/scan` opens the device camera (html5-qrcode); scan a generated QR (mentor
      panel, "Generate batch" → SVG/PNG)
- [ ] First scan: points, index name, and new team total animate correctly
- [ ] Same QR rescanned → friendly "already scanned" state (no error screen)
- [ ] QR from another game / another round / older than 24h → clear rejection message
- [ ] Scanning while game is PENDING/FINISHED → clear "game not active" message
- [ ] No team yet → prompt directs to team creation instead of dead-ending
- [ ] Avatar list / rank live-updates on the leaderboard while another device scores

## 5. Mentor house

- [ ] Mentor (`+212600000001`) sees the mentor dashboard after login
- [ ] Games list shows the seeded game with correct status / round / team counts
- [ ] Create a game → start → eliminate → next round → finish → reset flow; each
      transition reflects in any open PLAYER session within ~10 s (SSE timer)
- [ ] Runtime page shows `timer_sync_interval = 10000` (matches actual SSE cadence)
- [ ] Batch QR generation returns working SVGs that render as `<img>` (not inline
      `dangerouslySetInnerHTML`), and each renders/scans on the phone
- [ ] Leaderboard panel updates live without a manual reload
- [ ] Keyboard navigation (Tab) reaches all mentor controls; labels are announced
      by a screen reader

## 6. Resilience (optional, Redis available)

- [ ] Stop Postgres → scans/leaderboard return a 5xx with a graceful message, app
      doesn't hang forever
- [ ] With real Upstash configured (production-like): refresh after logout → 401;
      reusing an old refresh token → 401 (replay detection)

## 7. Offline / hygiene

- [ ] With server stopped, app shows a friendly offline state, not a white screen
- [ ] Service worker `sw.js` registers on a production build and returns 200
- [ ] No secrets visible in network responses or client bundle