import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loadEnvLocal } from "./env";

loadEnvLocal();

let prisma: PrismaClient | null = null;

function dbInstance(): PrismaClient {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

/** Creates a credential user directly in the DB (browser tests bypass the
 *  admin API for isolation). PLAYER users get an ACTIVE player row bound to
 *  the active game. Idempotent by username. */
export async function createUser(
  username: string,
  password: string,
  role: "PLAYER" | "MENTOR" = "PLAYER"
): Promise<string> {
  const db = dbInstance();
  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing) return existing.id;

  const hash = bcrypt.hashSync(password, 10);
  const user = await db.user.create({
    data: {
      username,
      password_hash: hash,
      role,
      nickname: username,
    },
    select: { id: true },
  });

  if (role === "PLAYER") {
    const game = await db.game.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { created_at: "desc" },
      select: { id: true },
    });
    if (game) {
      await db.player.create({
        data: {
          user_id: user.id,
          game_id: game.id,
          team_id: null,
          total_score: 0,
          status: "ACTIVE",
        },
      });
    }
  }
  return user.id;
}

/** The QrCode row that backs a scan for (index, round). */
export async function getQrCodeForIndex(
  indexId: string,
  roundId: string
): Promise<{ id: string; status: string; pool_value: number }> {
  const db = dbInstance();
  const code = await db.qrCode.findUnique({
    where: { index_id_round_id: { index_id: indexId, round_id: roundId } },
    select: { id: true, status: true, pool_value: true },
  });
  if (!code) {
    throw new Error(`No QrCode for index ${indexId} / round ${roundId}`);
  }
  return code;
}

export async function cleanupUsers(usernames: string[]): Promise<void> {
  if (usernames.length === 0) return;
  const db = dbInstance();
  const users = await db.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true },
  });
  if (users.length > 0) {
    await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  }
  await cleanupOrphanTeams(db);
}

export async function cleanupOrphanTeams(db: PrismaClient): Promise<void> {
  const orphaned = await db.team.findMany({
    where: { players: { none: {} } },
    select: { id: true },
  });
  if (orphaned.length > 0) {
    await db.team.deleteMany({ where: { id: { in: orphaned.map((t) => t.id) } } });
  }
}

export async function cleanupTeamsByGame(gameId: string): Promise<void> {
  const db = dbInstance();
  await db.team.deleteMany({ where: { game_id: gameId } });
}

export async function resetGame(
  gameId: string,
  status: "PENDING" | "ACTIVE" | "ELIMINATING" | "FINISHED" = "ACTIVE",
  currentRound = 1
): Promise<void> {
  const db = dbInstance();
  await db.game.update({
    where: { id: gameId },
    data: { status, current_round: currentRound },
  });
}

/** Reset the active round's clock so the SSE timer shows a live positive
 *  countdown rather than an already-expired 00:00. */
export async function resetActiveRoundClock(gameId: string): Promise<void> {
  const db = dbInstance();
  await db.round.updateMany({
    where: { game_id: gameId, status: "ACTIVE" },
    data: { started_at: new Date() },
  });
}

export async function getActiveGame(): Promise<{
  id: string;
  title: string;
  status: string;
  current_round: number;
}> {
  const db = dbInstance();
  const game = await db.game.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { created_at: "desc" },
  });
  if (!game) throw new Error("No ACTIVE game found for browser tests");
  return {
    id: game.id,
    title: game.title,
    status: game.status,
    current_round: game.current_round,
  };
}

export async function getRoundForGame(
  gameId: string,
  roundNumber: number
): Promise<{ id: string }> {
  const db = dbInstance();
  const round = await db.round.findFirst({
    where: { game_id: gameId, round_number: roundNumber },
    select: { id: true },
  });
  if (!round) throw new Error(`Round ${roundNumber} not found for game ${gameId}`);
  return round;
}

export async function getIndexesForGame(
  gameId: string,
  roundId: string
): Promise<Array<{ id: string; label: string; points: number }>> {
  const db = dbInstance();
  return db.index.findMany({
    where: { game_id: gameId, round_id: roundId },
    select: { id: true, label: true, points: true },
  });
}

export interface QaGame {
  id: string;
}

/** Create an isolated PENDING game with one locked round + an index for the
 *  mentor state-machine spec, so it never mutates the shared seeded game.
 *
 *  No round is pre-created: the state-machine "start" action creates round
 *  `current_round + 1`, and game_id×round_number is unique, so creating round 1
 *  here would collide. The index is attached roundless until start runs. */
export async function createQaGame(title: string): Promise<QaGame> {
  const db = dbInstance();
  const created = await db.game.create({
    data: {
      title,
      status: "PENDING",
      current_round: 0,
      created_by: "browser-tests",
      max_rounds: 3,
      round_duration: 1800,
      elimination_pct: 0.2,
    },
    select: { id: true },
  });
  await db.index.create({
    data: {
      game_id: created.id,
      label: "QA Probe",
      points: 25,
    },
  });
  return created;
}

export async function deleteGame(gameId: string): Promise<void> {
  const db = dbInstance();
  await db.game.deleteMany({ where: { id: gameId } });
}