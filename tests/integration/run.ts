/**
 * Zero-dependency integration suite for the scavenger-hunt API.
 *
 * Runs against a live server (default http://localhost:3000) with the DB
 * provisioned from the migrations + seed. Use in mock-Redis mode:
 *
 *   export UPSTASH_REDIS_REST_URL=
 *   export UPSTASH_REDIS_REST_TOKEN=
 *   npm run dev (in a separate process)
 *   npm run test:integration
 *
 * The runner provisions isolated QA fixtures and scrubs them afterwards,
 * so it is safe to re-run repeatedly against the same database.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hmacSign } from "@/lib/utils/crypto";
import { encodeQrPayload } from "@/lib/qr/generator";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SEED_GAME_ID = "00000000-0000-0000-0000-000000000001";
const SEED_MENTOR_USERNAME = "mentor";
const SEED_MENTOR_PASSWORD =
  process.env.CREDENTIALS_SEED_ADMIN_PASSWORD ?? "ChangeMe_Admin_2026!";
const SEED_PLAYER_PASSWORD =
  process.env.CREDENTIALS_SEED_PLAYER_PASSWORD ?? "DevPass_2026!";

const db = new PrismaClient();

const failures: string[] = [];
function check(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures.push(label);
    console.error(`  FAIL ${label}`);
  }
}

const now = Date.now();
function uniqueUsername(label: string): string {
  return `qa_int_${label}_${(now % 10000000).toString(36)}`;
}

async function provisionUser(
  username: string,
  password: string,
  role: "PLAYER" | "MENTOR" = "PLAYER"
): Promise<string> {
  const hash = bcrypt.hashSync(password, 10);
  const user = await db.user.create({
    data: { username, password_hash: hash, role, nickname: username },
    select: { id: true },
  });
  return user.id;
}

// ─── HTTP / cookie helpers ──────────────────────────────────────────────
type Jar = Map<string, string>;

function jarToHeader(jar: Jar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

// Safe dotted-path lookup over arbitrary nested JSON.
function at(value: unknown, path: string): unknown {
  let cur: unknown = value;
  for (const key of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

async function api(
  path: string,
  opts: { method?: string; body?: unknown; jar?: Jar; token?: string } = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic HTTP JSON in test harness; narrowing is done at call sites
): Promise<{ status: number; json: any; setCookies: Map<string, string> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.jar && opts.jar.size > 0) headers.Cookie = jarToHeader(opts.jar);
  if (opts.token) headers.Cookie = `access_token=${opts.token}`;

  const res = await fetch(BASE_URL + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const setCookies = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same reason as above; chained access (res.json?.data?.x) needs indexable
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON (SSE / empty) responses are handled by callers
  }

  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    setCookies.set(key, value);
    if (opts.jar && value !== "" && !raw.includes("Max-Age=0")) {
      opts.jar.set(key, value);
    } else if (opts.jar && (value === "" || raw.includes("Max-Age=0"))) {
      opts.jar.delete(key);
    }
  }

  return { status: res.status, json, setCookies };
}

async function signIn(
  jar: Jar,
  username: string,
  password: string
): Promise<{ role: string; user_id: string; username: string }> {
  const res = await api(`/api/v1/auth/login`, {
    method: "POST",
    body: { username, password },
    jar,
  });
  if (res.status !== 200) {
    throw new Error(`signIn(${username}) failed with status ${res.status}: ${JSON.stringify(res.json)}`);
  }
  return {
    role: res.json?.data?.user?.role,
    user_id: res.json?.data?.user?.id,
    username: res.json?.data?.user?.username,
  };
}

// Build a QR payload string signed with the shared HMAC_SECRET. The payload
// is bound to the QrCode row so the scan route can enforce single-claim.
function signedQr(
  indexId: string,
  gameId: string,
  codeId: string,
  ts?: string
): string {
  const timestamp = ts ?? new Date().toISOString();
  return encodeQrPayload({
    code_id: codeId,
    index_id: indexId,
    game_id: gameId,
    timestamp,
    signature: hmacSign(codeId, indexId, gameId, timestamp),
  });
}

// ─── SSE helpers ────────────────────────────────────────────────────────
async function readSse(
  path: string,
  token: string,
  wanted: (e: Record<string, unknown>) => boolean,
  timeoutMs: number
): Promise<Record<string, unknown>[]> {
  const ac = new AbortController();
  const res = await fetch(BASE_URL + path, {
    headers: { Cookie: `access_token=${token}` },
    signal: ac.signal,
  });
  if (!res.ok || !res.body) throw new Error(`SSE ${path} returned ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const events: Record<string, unknown>[] = [];
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      let chunk;
      try {
        chunk = await Promise.race([
          reader.read(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining)),
        ]);
      } catch {
        break;
      }
      if (chunk === null) break;
      const { done, value } = chunk;
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buf.indexOf("\n\n")) !== -1) {
        const raw = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const dataLine = raw.split("\n").find((l) => l.startsWith("data:") && l.length > 5);
        if (!dataLine) continue;
        const event = JSON.parse(dataLine.slice(5).trim());
        events.push(event);
        if (wanted(event)) return events;
      }
    }
  } finally {
    ac.abort();
  }
  return events;
}

// ─── Fixtures & cleanup ────────────────────────────────────────────────
function fixtureTeamCode(seed: number): string {
  return `QA${seed.toString(36).padStart(4, "0").toUpperCase()}`;
}

let FULL_USER = "";
let PENDING_USER = "";

async function createFixtures(): Promise<void> {
  FULL_USER = uniqueUsername("full").slice(0, 28);
  PENDING_USER = uniqueUsername("pending").slice(0, 28);
  await db.user.deleteMany({ where: { username: { in: [FULL_USER, PENDING_USER] } } });
  await db.game.deleteMany({ where: { title: { startsWith: "QA-" } } });
  await db.team.deleteMany({ where: { name: { startsWith: "QA-" } } });

  // Re-arm every QR code for the seeded game so the single-claim scan matrix
  // starts from a clean slate on every run (previous runs deplete them).
  await db.qrCode.updateMany({
    where: { game_id: SEED_GAME_ID },
    data: { status: "ACTIVE", first_scanned_at: null },
  });
  await db.$executeRawUnsafe(
    `UPDATE qr_codes SET pool_value = points WHERE game_id = '${SEED_GAME_ID}'`
  );

  // Seed now stages the hunt PENDING; bring it to ACTIVE (round 1 running)
  // so the scan matrix / SSE suites in this file behave as before.
  await db.game.update({
    where: { id: SEED_GAME_ID },
    data: {
      status: "ACTIVE",
      current_round: 1,
      started_at: new Date(),
    },
  });
  await db.round.upsert({
    where: { game_id_round_number: { game_id: SEED_GAME_ID, round_number: 1 } },
    update: { status: "ACTIVE", started_at: new Date() },
    create: {
      game_id: SEED_GAME_ID,
      round_number: 1,
      status: "ACTIVE",
      started_at: new Date(),
    },
  });

  const mentor = await db.user.findUnique({ where: { username: SEED_MENTOR_USERNAME } });
  const createdBy = mentor?.id ?? "unknown";

  const fullGame = await db.game.create({
    data: {
      title: "QA-Full-Game",
      description: "fixture: game already at the team cap",
      created_by: createdBy,
      max_rounds: 3,
      round_duration: 1800,
      elimination_pct: 0.2,
      status: "PENDING",
    },
  });
  await db.team.createMany({
    data: Array.from({ length: 100 }, (_, i) => ({
      name: `QA-Full-${i}`,
      invite_code: fixtureTeamCode(1000 + i),
      game_id: fullGame.id,
    })),
  });
  const fullUser = await db.user.create({
    data: {
      username: FULL_USER,
      password_hash: bcrypt.hashSync(SEED_PLAYER_PASSWORD, 10),
      role: "PLAYER",
    },
  });
  await db.player.create({
    data: { user_id: fullUser.id, game_id: fullGame.id, status: "ACTIVE" },
  });

  const pendingGame = await db.game.create({
    data: {
      title: "QA-Pending-Game",
      description: "fixture: game not yet started",
      created_by: createdBy,
      max_rounds: 3,
      round_duration: 1800,
      elimination_pct: 0.2,
      status: "PENDING",
    },
  });
  const pendingTeam = await db.team.create({
    data: { name: "QA-PendingTeam", invite_code: fixtureTeamCode(999), game_id: pendingGame.id },
  });
  const pendingUser = await db.user.create({
    data: {
      username: PENDING_USER,
      password_hash: bcrypt.hashSync(SEED_PLAYER_PASSWORD, 10),
      role: "PLAYER",
    },
  });
  await db.player.create({
    data: {
      user_id: pendingUser.id,
      game_id: pendingGame.id,
      team_id: pendingTeam.id,
      status: "ACTIVE",
    },
  });

  console.log("  fixtures ready (full game @100 teams, pending game + team)");
}

async function cleanup(usernames: string[]): Promise<void> {
  await db.user.deleteMany({ where: { username: { in: [...new Set(usernames)] } } });
  await db.game.deleteMany({ where: { title: { startsWith: "QA-" } } });
  await db.team.deleteMany({ where: { name: { startsWith: "QA-" } } });
}

// ─── Scenarios ──────────────────────────────────────────────────────────
async function s1AuthLifecycle(): Promise<string[]> {
  console.log("S1 auth lifecycle");
  const jar: Jar = new Map();
  const u1 = uniqueUsername("s1").slice(0, 28);
  await provisionUser(u1, SEED_PLAYER_PASSWORD);

  let res = await api("/api/v1/auth/me");
  check(res.status === 401, "unauthenticated /auth/me -> 401");

  res = await api("/api/v1/auth/login", { method: "POST", body: { username: "ab", password: SECRET_PASS } });
  check(res.status === 400 && res.json?.error === "VALIDATION_ERROR", "login rejects too-short username");

  res = await api("/api/v1/auth/login", { method: "POST", body: { username: u1, password: "WrongPass_123!" } });
  check(res.status === 401 && res.json?.error === "INVALID_CREDENTIALS", "login rejects wrong password");

  res = await api("/api/v1/auth/login", { method: "POST", body: { username: u1, password: SEED_PLAYER_PASSWORD }, jar });
  check(res.status === 200 && res.json?.data?.user?.role === "PLAYER", "login signs in as PLAYER");
  const userId = res.json?.data?.user?.id as string;
  check(jar.has("access_token") && jar.has("refresh_token"), "auth cookies set");
  const accessBeforeRefresh = jar.get("access_token");

  res = await api("/api/v1/auth/me", { jar });
  check(res.status === 200 && res.json?.data?.user?.username === u1, "me returns the signed-in user");

  res = await api("/api/v1/players/me", { jar });
  check(res.status === 200 && res.json?.data?.total_score === 0 && res.json?.data?.team === null, "fresh player profile with zero balance");

  res = await api("/api/v1/players/me", { method: "PUT", body: { nickname: "x".repeat(51) }, jar });
  check(res.status === 400 && res.json?.error === "VALIDATION_ERROR", "nickname over 50 chars rejected");

  res = await api("/api/v1/players/me", { method: "PUT", body: { nickname: "QA Niffler" }, jar });
  check(res.status === 200 && res.json?.data?.nickname === "QA Niffler", "nickname updated");

  res = await api("/api/v1/auth/refresh", { method: "POST", jar });
  check(res.status === 200 && Boolean(jar.get("refresh_token")), "refresh rotates tokens");
  check(jar.get("access_token") !== accessBeforeRefresh, "access token rotated on refresh");

  // A stale/garbage refresh token must be rejected.
  const staleJar: Jar = new Map([["access_token", "x"], ["refresh_token", "not-a-jwt"]]);
  const staleRes = await api("/api/v1/auth/refresh", { method: "POST", jar: staleJar });
  check(staleRes.status === 401, "refresh with garbage token -> 401");

  res = await api("/api/v1/auth/logout", { method: "POST", jar });
  check(res.status === 200, "logout succeeds");
  const cookieJarAfterLogout = res.setCookies;
  check(
    !cookieJarAfterLogout.get("access_token") && !cookieJarAfterLogout.get("refresh_token"),
    "logout expires auth cookies (empty-value deletion entries)"
  );

  const clearedJar: Jar = new Map();
  res = await api("/api/v1/auth/me", { jar: clearedJar });
  check(res.status === 401, "me after logout -> 401");

  return [u1, userId];
}

const SECRET_PASS = "Just4Tests_2026!";

async function s2AutoRegistration(): Promise<string[]> {
  console.log("S2 player auto-registration");
  const u2 = uniqueUsername("s2").slice(0, 28);
  const jar: Jar = new Map();
  await provisionUser(u2, SEED_PLAYER_PASSWORD);
  await signIn(jar, u2, SEED_PLAYER_PASSWORD);

  const user = await db.user.findUnique({ where: { username: u2 } });
  check(Boolean(user), "user row pre-provisioned for login");

  const player = user ? await db.player.findUnique({ where: { user_id: user.id } }) : null;
  check(Boolean(player), "player profile auto-created on login");
  check(player ? player.game_id === SEED_GAME_ID : false, "auto-registration lands in the active seeded game");
  check((player?.total_score ?? -1) === 0, "new player starts at zero");

  const res = await api("/api/v1/players/me", { jar });
  check(res.status === 200, "player profile readable over HTTP");

  return [u2];
}

async function s3Teams(): Promise<string[]> {
  console.log("S3 teams");
  const usernames = Array.from({ length: 5 }, (_, i) => uniqueUsername(`t${i + 1}`).slice(0, 28));
  const jars = usernames.map(() => new Map() as Jar);
  const roles = await Promise.all(
    usernames.map(async (u, i) => {
      await provisionUser(u, SEED_PLAYER_PASSWORD);
      return signIn(jars[i], u, SEED_PLAYER_PASSWORD);
    })
  );
  check(roles.every((r) => r.role === "PLAYER"), "all team players signed in");

  const teamName = `QA-Team-${now}`;
  let res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: teamName }, jar: jars[0] });
  check(res.status === 200 && res.json?.data?.invite_code, "player 1 creates a team");
  const inviteCode = res.json?.data?.invite_code as string;

  // The creator is the captain of the new team (M2).
  res = await api("/api/v1/players/me", { jar: jars[0] });
  const myPlayerId = res.json?.data?.id as string;
  const myTeam = res.json?.data?.team as { captain_id: string };
  check(myTeam?.captain_id === myPlayerId, "team creator is recorded as captain");

  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "dup" }, jar: jars[0] });
  check(res.status === 409, "already-in-team create -> conflict");

  res = await api("/api/v1/players/me", { jar: jars[0] });
  check(res.json?.data?.team?.invite_code === inviteCode, "me reports the created team");

  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "x", invite_code: "ZZZZZZ" }, jar: jars[1] });
  check(res.status === 400 && res.json?.error === "INVALID_CODE", "join with bad invite code rejected");

  for (let i = 1; i <= 3; i++) {
    res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "x", invite_code: inviteCode }, jar: jars[i] });
    check(res.status === 200 && res.json?.data?.member_count === i + 1, `join fills slot ${i + 1}`);
  }

  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "x", invite_code: inviteCode }, jar: jars[4] });
  check(res.status === 409 && res.json?.error === "TEAM_FULL", "5th member rejected with TEAM_FULL");

  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "own" }, jar: jars[1] });
  check(res.status === 409, "player already in a team cannot create another");

  const fullJar: Jar = new Map();
  await signIn(fullJar, FULL_USER, SEED_PLAYER_PASSWORD);
  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "QA-Overflow" }, jar: fullJar });
  check(res.status === 409 && res.json?.error === "MAX_TEAMS_REACHED", "team create blocked at MAX_TEAMS_PER_GAME");

  // ── M2: captain management (GET detail, kick, leave, transfer, disband) ──
  const capUsers = Array.from({ length: 3 }, (_, i) => uniqueUsername(`cap${i + 1}`).slice(0, 28));
  const capJars = capUsers.map(() => new Map() as Jar);
  await Promise.all(
    capUsers.map(async (u, i) => {
      await provisionUser(u, SEED_PLAYER_PASSWORD);
      return signIn(capJars[i], u, SEED_PLAYER_PASSWORD);
    })
  );

  res = await api("/api/v1/players/me/team", { jar: capJars[0] });
  check(res.status === 200 && res.json?.data?.team === null, "GET team returns null when not in a team");

  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "QA-Captain" }, jar: capJars[0] });
  check(res.status === 200 && res.json?.data?.invite_code, "captain creates a fresh team");
  const capCode = res.json?.data?.invite_code as string;

  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "x", invite_code: capCode }, jar: capJars[1] });
  check(res.status === 200, "member joins the captain team");

  res = await api("/api/v1/players/me/team", { jar: capJars[0] });
  const capTeam = res.json?.data?.team as { members: Array<{ id: string; username: string; is_captain: boolean; is_me: boolean }> } | null;
  check(Boolean(capTeam) && capTeam?.members.length === 2, "GET team lists members");
  const captainLookup = capTeam?.members.find((m) => m.is_captain);
  check(Boolean(captainLookup) && captainLookup?.is_me === true, "GET team exposes is_captain flag");
  const memberId = (capTeam?.members.find((m) => !m.is_captain)?.id ?? "") as string;

  res = await api(`/api/v1/players/me/team/members/${memberId}`, { method: "DELETE", jar: capJars[1] });
  check(res.status === 403, "non-captain cannot kick a crewmate (403)");

  res = await api(`/api/v1/players/me/team/members/${memberId}`, { method: "DELETE", jar: capJars[0] });
  check(res.status === 200, "captain kicks a member (200)");

  res = await api("/api/v1/players/me/team", { jar: capJars[1] });
  check(res.json?.data?.team === null, "kicked member is no longer on the team");

  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "x", invite_code: capCode }, jar: capJars[1] });
  check(res.status === 200, "kicked member can rejoin by invite");

  res = await api("/api/v1/players/me/team", { method: "DELETE", jar: capJars[0] });
  check(res.status === 409 && res.json?.error === "CAPTAIN_CANNOT_LEAVE", "captain cannot leave while crewmates remain");

  res = await api(`/api/v1/players/me/team/members/${memberId}`, { method: "PATCH", jar: capJars[0] });
  check(res.status === 200 && res.json?.data?.captain_id === memberId, "captain transfers leadership");

  res = await api(`/api/v1/players/me/team/members/${memberId}`, { method: "PATCH", jar: capJars[0] });
  check(res.status === 403, "former captain cannot transfer again (403)");

  res = await api("/api/v1/players/me/team", { method: "DELETE", jar: capJars[0] });
  check(res.status === 200, "former captain can leave after transfer");

  res = await api("/api/v1/players/me/team", { jar: capJars[0] });
  check(res.json?.data?.team === null, "former captain is team-less after leaving");

  res = await api("/api/v1/players/me/team", { method: "DELETE", jar: capJars[1] });
  check(res.status === 200 && res.json?.data?.left === true, "sole remaining captain can leave (team disbands)");

  res = await api("/api/v1/players/me/team", { jar: capJars[1] });
  check(res.json?.data?.team === null, "team is gone after dissolution");

  return [...usernames, ...capUsers];
}

async function s4ScanMatrix(): Promise<string[]> {
  console.log("S4 scan matrix");
  const index = await db.index.findFirst({
    where: { game_id: SEED_GAME_ID },
    orderBy: { id: "asc" },
  });
  const game = await db.game.findUnique({ where: { id: SEED_GAME_ID } });
  if (!index || !game) throw new Error("seed data missing for scan matrix");

  const qr1 = await db.qrCode.findUnique({
    where: { index_id: index.id },
  });
  if (!qr1) throw new Error("seed QR missing for first index");

  const usernames = [uniqueUsername("s4a").slice(0, 28), uniqueUsername("s4b").slice(0, 28)];
  const jars = usernames.map(() => new Map() as Jar);
  await provisionUser(usernames[0], SEED_PLAYER_PASSWORD);
  await provisionUser(usernames[1], SEED_PLAYER_PASSWORD);
  await signIn(jars[0], usernames[0], SEED_PLAYER_PASSWORD);
  await signIn(jars[1], usernames[1], SEED_PLAYER_PASSWORD);

  // The scanning player must belong to a team (the scan route enforces NO_TEAM
  // otherwise). The second player stays team-less to exercise that guard.
  let res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "QA-Scan-Team" }, jar: jars[0] });
  check(res.status === 200, "scan player creates a team");

  // Mentor is forbidden to scan.
  const mentorJar: Jar = new Map();
  await signIn(mentorJar, SEED_MENTOR_USERNAME, SEED_MENTOR_PASSWORD);
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: signedQr(index.id, SEED_GAME_ID, qr1.id) }, jar: mentorJar });
  check(res.status === 403, "mentor cannot scan (403)");

  // Happy path: a valid first scan drains the pool and awards full points.
  const happy = signedQr(index.id, SEED_GAME_ID, qr1.id);
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: happy }, jar: jars[0] });
  check(res.status === 200 && res.json?.data?.points_earned === index.points, `scan awards full pool (${index.points} pts)`);
  check(res.json?.data?.index?.label === index.label, "scan response identifies the index");

  // Dashboard stats reflect the scan: passed challenges increment and the team
  // gets a concrete rank from the DB fallback (mock Redis is empty in dev).
  res = await api("/api/v1/players/me", { jar: jars[0] });
  check(res.status === 200 && res.json?.data?.passed_challenges === 1, "dashboard reports 1 passed challenge after scan");
  check(typeof res.json?.data?.team_rank === "number" && res.json?.data?.team_rank >= 1, "dashboard reports a numeric team rank (DB fallback)");

  // The same player cannot re-claim the same index.
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: happy }, jar: jars[0] });
  check(res.status === 400 && res.json?.error === "ALREADY_SCANNED", "same player re-scan rejected (ALREADY_SCANNED)");

  // A second player/team can still claim the code but earns 33% less than the
  // original value (rounded, 67% of `points`), and that reduced rate is stable.
  const reduced = Math.max(1, Math.round(index.points * 0.67));
  const drainer = uniqueUsername("s4c").slice(0, 28);
  usernames.push(drainer);
  await provisionUser(drainer, SEED_PLAYER_PASSWORD);
  const drainJar: Jar = new Map();
  await signIn(drainJar, drainer, SEED_PLAYER_PASSWORD);
  await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "QA-Scan-Team-2" }, jar: drainJar });
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: happy }, jar: drainJar });
  check(res.status === 200 && res.json?.data?.points_earned === reduced, `second scan earns ${reduced} pts (33% off the original)`);

  // Negative cases use a *second* index so the depleted-code guard can't
  // short-circuit the validation path under test.
  const index2 = await db.index.findFirst({
    where: { game_id: SEED_GAME_ID, id: { not: index.id } },
    orderBy: { id: "asc" },
  });
  if (!index2) throw new Error("expected a second seeded index");
  const qr2 = await db.qrCode.findUnique({
    where: { index_id: index2.id },
  });
  if (!qr2) throw new Error("seed QR missing for second index");

  // Invalid signature (corrupt the signed signature field, keep base64 valid).
  // XOR the first hex digit so the corruption is guaranteed to change the
  // value even when the HMAC already starts with "0".
  const stamp = new Date().toISOString();
  const signature = hmacSign(qr2.id, index2.id, SEED_GAME_ID, stamp);
  const taintedFirst =
    (Number.parseInt(signature[0]!, 16) ^ 1).toString(16);
  const corrupted = encodeQrPayload({
    code_id: qr2.id,
    index_id: index2.id,
    game_id: SEED_GAME_ID,
    timestamp: stamp,
    signature: taintedFirst + signature.slice(1),
  });
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: corrupted }, jar: jars[0] });
  check(res.status === 400 && String(res.json?.message).includes("QR_SIGNATURE_INVALID"), "tampered signature rejected");

  // Game mismatch
  const otherGame = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: signedQr(index2.id, otherGame, qr2.id) }, jar: jars[0] });
  check(res.status === 400 && String(res.json?.message).includes("QR_GAME_MISMATCH"), "QR bound to another game rejected");

  // Jailbroken / expired / future / undecodable timestamps
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: signedQr(index2.id, SEED_GAME_ID, qr2.id, old) }, jar: jars[0] });
  check(res.status === 400 && String(res.json?.message).includes("QR_EXPIRED"), "expired QR rejected");

  const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: signedQr(index2.id, SEED_GAME_ID, qr2.id, future) }, jar: jars[0] });
  check(res.status === 400 && String(res.json?.message).includes("QR_FUTURE_TIMESTAMP"), "future-dated QR rejected");

  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: "@@@not-qr@@@" }, jar: jars[0] });
  check(res.status === 400 && String(res.json?.message).includes("QR_DECODE_FAILED"), "undecodable QR rejected");

  // Fresh player with no team can't scan
  const qrNoTeam = signedQr(index.id, SEED_GAME_ID, qr1.id);
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: qrNoTeam }, jar: jars[1] });
  check(res.status === 400 && res.json?.error === "NO_TEAM", "scan without a team rejected");

  // Eliminated teams lose scan access entirely.
  const eliminatedUser = uniqueUsername("s4e").slice(0, 28);
  usernames.push(eliminatedUser);
  await provisionUser(eliminatedUser, SEED_PLAYER_PASSWORD);
  const eliminatedJar: Jar = new Map();
  await signIn(eliminatedJar, eliminatedUser, SEED_PLAYER_PASSWORD);
  res = await api("/api/v1/players/me/team", { method: "POST", body: { team_name: "QA-Eliminated-Team" }, jar: eliminatedJar });
  check(res.status === 200, "eliminated-candidate team created");
  const elimPlayer = await db.player.findUnique({
    where: { user_id: (await db.user.findUnique({ where: { username: eliminatedUser } }))?.id },
  });
  if (elimPlayer?.team_id) {
    await db.team.update({
      where: { id: elimPlayer.team_id },
      data: { eliminated: true },
    });
  }
  const qrEliminated = signedQr(index2.id, SEED_GAME_ID, qr2.id);
  res = await api(`/api/v1/games/${SEED_GAME_ID}/scan`, { method: "POST", body: { qr_data: qrEliminated }, jar: eliminatedJar });
  check(res.status === 400 && res.json?.error === "TEAM_ELIMINATED", "eliminated team cannot scan (TEAM_ELIMINATED)");

  // Player in a not-yet-started game
  const pendingUser = await db.user.findUnique({ where: { username: PENDING_USER } });
  const pendingGame = pendingUser
    ? await db.player.findUnique({ where: { user_id: pendingUser.id } })
    : null;
  const pendingGameId = pendingGame?.game_id ?? "";
  const pendingJar: Jar = new Map();
  await signIn(pendingJar, PENDING_USER, SEED_PLAYER_PASSWORD);
  res = await api(`/api/v1/games/${pendingGameId}/scan`, { method: "POST", body: { qr_data: signedQr(index.id, pendingGameId, qr1.id) }, jar: pendingJar });
  check(res.status === 400 && res.json?.error === "GAME_NOT_ACTIVE", "scan in a PENDING game rejected");

  // Scan history ledger
  res = await api("/api/v1/players/me/scans", { jar: jars[0] });
  check(res.status === 200 && res.json?.data?.total >= 1, "player scans ledger populated");
  check(res.json?.data?.scans?.[0]?.index_label === index.label, "scan ledger reports index label");

  return usernames;
}

async function s5Admin(): Promise<string[]> {
  console.log("S5 admin");
  const usernames: string[] = [];
  const mentorJar: Jar = new Map();
  const role = await signIn(mentorJar, SEED_MENTOR_USERNAME, SEED_MENTOR_PASSWORD);
  check(role.role === "MENTOR", "mentor signs in with MENTOR role");

  // PLAYER forbidden on admin surface
  const playerUser = uniqueUsername("s5").slice(0, 28);
  await provisionUser(playerUser, SEED_PLAYER_PASSWORD);
  usernames.push(playerUser);
  const playerJar: Jar = new Map();
  await signIn(playerJar, playerUser, SEED_PLAYER_PASSWORD);
  let res = await api("/api/v1/admin/runtime", { jar: playerJar });
  check(res.status === 403, "player blocked from admin runtime");

  // Runtime config truthfulness
  res = await api("/api/v1/admin/runtime", { jar: mentorJar });
  check(res.status === 200, "mentor reads runtime config");
  check(res.json?.data?.auth?.provider === "credentials", "runtime reports auth provider credentials");
  check(res.json?.data?.mentor?.username === SEED_MENTOR_USERNAME, "runtime reports the signed-in mentor");
  check(res.json?.data?.sse?.timer_sync_interval === 10000, "runtime reports timer_sync_interval 10000");
  check(res.json?.data?.sse?.heartbeat_interval === 25000, "runtime reports heartbeat_interval 25000");

  // Seed game visible
  res = await api("/api/v1/admin/games", { jar: mentorJar });
  const seedGame = (res.json?.data ?? []).find((g: Record<string, unknown>) => g.id === SEED_GAME_ID);
  check(Boolean(seedGame) && seedGame.status === "ACTIVE", "seeded game listed as ACTIVE");

  // Admin user provisioning + password reset
  const provisionedUser = uniqueUsername("admin").slice(0, 28);
  res = await api("/api/v1/admin/users", {
    method: "POST", jar: mentorJar,
    body: { username: provisionedUser, password: SECRET_PASS, role: "PLAYER" },
  });
  check(res.status === 200 && res.json?.data?.player, "mentor provisions a PLAYER account with a player row");
  const provisioned = await db.user.findUnique({
    where: { username: provisionedUser },
    include: { player: true },
  });
  check(Boolean(provisioned?.player), "provisioned user has an active player profile");
  check(provisioned?.player?.game_id === SEED_GAME_ID, "provisioned player lands in the active seeded game");

  res = await api("/api/v1/admin/users", {
    method: "POST", jar: mentorJar,
    body: { username: provisionedUser, password: SECRET_PASS, role: "PLAYER" },
  });
  check(res.status === 409 && res.json?.error === "CONFLICT", "duplicate provisioning rejected");

  res = await api(`/api/v1/admin/users/${provisioned!.id}/reset-password`, {
    method: "POST", jar: mentorJar,
    body: { password: `${SECRET_PASS}2` },
  });
  check(res.status === 200, "mentor resets a user's password");

  const newPassJar: Jar = new Map();
  res = await api("/api/v1/auth/login", { method: "POST", body: { username: provisionedUser, password: SECRET_PASS }, jar: newPassJar });
  check(res.status === 401, "old password rejected after reset");
  res = await api("/api/v1/auth/login", { method: "POST", body: { username: provisionedUser, password: `${SECRET_PASS}2` }, jar: newPassJar });
  check(res.status === 200, "new password accepted after reset");
  usernames.push(provisionedUser);

  // Batch QR generation (svg field shape)
  const seedIndexCount = await db.index.count({ where: { game_id: SEED_GAME_ID } });
  check(seedIndexCount >= 20, "seeded game holds the 20-marker course");
  res = await api("/api/v1/admin/indexes/generate", {
    method: "POST", jar: mentorJar,
    body: { game_id: SEED_GAME_ID, format: "svg" },
  });
  check(res.status === 200 && Array.isArray(res.json?.data?.codes), "batch QR generation returns codes");
  const codes = res.json?.data?.codes ?? [];
  check(codes.length === seedIndexCount, `batch QR generates one code per seeded index (${seedIndexCount})`);
  check(codes.every((c: Record<string, unknown>) => typeof c.svg === "string" && (c.svg as string).startsWith("<svg")), "svg payload under `svg` field");
  check(codes.every((c: Record<string, unknown>) => !("data" in c)), "no legacy `data` field leaked");
  check(codes.every((c: Record<string, unknown>) => typeof c.code_id === "string" && c.status === "ACTIVE" && Number(c.pool_value) === Number(c.points)), "each code reports its code_id, ACTIVE status and full pool");

  // Single QR generation missing fields
  res = await api(`/api/v1/admin/indexes/00000000-0000-0000-0000-000000000001/qr`, {
    method: "POST", jar: mentorJar, body: {},
  });
  check(res.status === 400 && res.json?.error === "VALIDATION_ERROR", "single QR without fields -> 400");

  // Game creation
  res = await api("/api/v1/admin/games", { method: "POST", jar: mentorJar, body: { title: "" } });
  check(res.status === 400 && res.json?.error === "VALIDATION_ERROR", "game create rejects empty title");

  res = await api("/api/v1/admin/games", {
    method: "POST", jar: mentorJar,
    body: { title: `QA-Transitions-${now}` },
  });
  check(res.status === 201, "mentor creates a game");
  const newGameId = res.json?.data?.id as string;

  // Full state machine lifecycle
  async function transition(action: string) {
    return api(`/api/v1/admin/games/${newGameId}/state`, { method: "POST", jar: mentorJar, body: { action } });
  }

  res = await transition("start");
  check(res.status === 200 && res.json?.data?.new_status === "ACTIVE" && res.json?.data?.current_round === 1, "start -> ACTIVE (round 1)");

  res = await transition("start");
  check(res.status === 400 && res.json?.error === "INVALID_TRANSITION", "start twice rejected");

  res = await transition("eliminate");
  check(res.status === 200 && res.json?.data?.new_status === "ELIMINATING", "eliminate -> ELIMINATING");

  res = await transition("next_round");
  check(res.status === 200 && res.json?.data?.new_status === "ACTIVE" && res.json?.data?.current_round === 2, "next_round -> ACTIVE (round 2)");

  res = await transition("eliminate");
  check(res.status === 200 && res.json?.data?.new_status === "ELIMINATING", "round 2 elimination");

  res = await transition("finish");
  check(res.status === 200 && res.json?.data?.new_status === "FINISHED", "finish -> FINISHED");

  res = await transition("reset");
  check(res.status === 200 && res.json?.data?.new_status === "PENDING" && res.json?.data?.current_round === 0, "reset -> PENDING (round 0)");

  return [newGameId, ...usernames];
}

async function s6Sse(): Promise<string[]> {
  console.log("S6 SSE");
  const username = uniqueUsername("s6").slice(0, 28);
  const jar: Jar = new Map();
  await provisionUser(username, SEED_PLAYER_PASSWORD);
  await signIn(jar, username, SEED_PLAYER_PASSWORD);
  const token = jar.get("access_token") as string;

  const timerEvents = await readSse(`/api/v1/sse/timer/${SEED_GAME_ID}`, token, (e) => e.type === "timer", 8000);
  const timer = timerEvents.find((e) => e.type === "timer");
  check(Boolean(timer), "timer SSE emits a timer event");
  check(at(timer, "round.number") === 1 && at(timer, "round.total") === 1800, "timer reports round 1 / 1800s");
  check(at(timer, "status") === "ACTIVE", "timer reports ACTIVE game state");

  const leaderboardEvents = await readSse(`/api/v1/sse/leaderboard/${SEED_GAME_ID}`, token, (e) => e.type === "leaderboard", 8000);
  const leaderboard = leaderboardEvents.find((e) => e.type === "leaderboard");
  check(Boolean(leaderboard) && Array.isArray(at(leaderboard, "teams")), "leaderboard SSE emits a team list");
  const teams = at(leaderboard, "teams") as Record<string, unknown>[];
  check(teams.length >= 1, `leaderboard lists ${teams.length} team(s)`);
  const scores = teams.map((t) => Number(t.score));
  check(scores.every((s: number, i: number) => i === 0 || s <= scores[i - 1]), "leaderboard sorted by score descending");
  check(scores.some((s: number) => s > 0), "at least one team scored during the run");

  const noToken = await api(`/api/v1/sse/timer/${SEED_GAME_ID}`);
  check(noToken.status === 401, "SSE without token -> 401");

  return [username];
}

async function s7Ledger(): Promise<void> {
  console.log("S7 ledger/telemetry");
  const mentorJar: Jar = new Map();
  await signIn(mentorJar, SEED_MENTOR_USERNAME, SEED_MENTOR_PASSWORD);

  const res = await api(`/api/v1/admin/teams?game_id=${SEED_GAME_ID}`, { jar: mentorJar });
  check(res.status === 200, "admin lists teams");
  const scored = (res.json?.data ?? []).filter((t: Record<string, unknown>) => Number(t.total_score) > 0);
  check(scored.length >= 1, `admin sees ${scored.length} scored team(s)`);

  const byGame = await api(`/api/v1/admin/games/${SEED_GAME_ID}/teams`, { jar: mentorJar });
  check(byGame.status === 200 && Array.isArray(byGame.json?.data), "per-game teams endpoint works");
  check((byGame.json?.data ?? []).length >= 1, "per-game teams endpoint lists teams");
}

async function main(): Promise<void> {
  console.log(`scavenger-hunt integration suite -> ${BASE_URL}`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  await db.$connect();

  let allUsernames: string[] = [];
  let qaGameIds: string[] = [];
  try {
    await createFixtures();

    const s1 = await s1AuthLifecycle();
    const s2 = await s2AutoRegistration();
    const s3 = await s3Teams();
    const s4 = await s4ScanMatrix();
    const s5 = await s5Admin();
    const s6 = await s6Sse();
    await s7Ledger();

    allUsernames = [...s1, ...s2, ...s3, ...s4, ...s5, ...s6];
    qaGameIds = s5.filter((x) => x.length === 36); // the transition game id
  } finally {
    await cleanup([
      ...allUsernames.filter((x) => x.startsWith("qa_int_")),
      FULL_USER,
      PENDING_USER,
    ]);
    await db.game.deleteMany({ where: { id: { in: qaGameIds } } });
    await db.$disconnect();
  }

  console.log("");
  if (failures.length === 0) {
    console.log("ALL INTEGRATION SCENARIOS PASSED");
  } else {
    console.error(`${failures.length} integration assertion(s) FAILED:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("integration suite crashed:", err);
  process.exitCode = 1;
});