import { redis } from "@/lib/db/redis";
import { db } from "@/lib/db/postgres";

const LEADERBOARD_KEY_PREFIX = "leaderboard:";
// True when a real Upstash URL is configured (production-grade beat).
// In local dev the mock returns empty zsets, so we fall back to the DB.
const REAL_REDIS = (process.env.UPSTASH_REDIS_REST_URL ?? "").startsWith(
  "https://"
) && (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").length > 0;

export function getLeaderboardKey(gameId: string): string {
  return `${LEADERBOARD_KEY_PREFIX}${gameId}`;
}

export async function updateLeaderboard(
  gameId: string,
  teamId: string,
  score: number
): Promise<void> {
  const key = getLeaderboardKey(gameId);
  await redis.zadd(key, { score, member: teamId });
}

export interface LeaderboardRow {
  teamId: string;
  name: string;
  score: number;
  rank: number;
  eliminated: boolean;
  memberCount: number;
}

export async function getLeaderboardRows(
  gameId: string,
  offset = 0,
  count = 100
): Promise<LeaderboardRow[]> {
  let entries: Array<{ teamId: string; score: number; rank: number }>;

  if (REAL_REDIS) {
    const key = getLeaderboardKey(gameId);
    const results = await redis.zrange(key, offset, count - 1, {
      rev: true,
      withScores: true,
    });
    entries = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        teamId: results[i] as string,
        score: results[i + 1] as number,
        rank: offset + i / 2 + 1,
      });
    }
  } else {
    const teams = await db.team.findMany({
      where: { game_id: gameId },
      orderBy: [{ total_score: "desc" }, { created_at: "asc" }],
      select: { id: true, name: true, total_score: true, eliminated: true },
    });
    entries = teams.map((t, i) => ({
      teamId: t.id,
      score: t.total_score,
      rank: offset + i + 1,
    }));
  }

  const rows: LeaderboardRow[] = [];

  const teamIds = entries.map((e) => e.teamId);
  const teamDetails = await db.team.findMany({
    where: { id: { in: teamIds } },
    select: {
      id: true,
      name: true,
      eliminated: true,
      _count: { select: { players: true } },
    },
  });

  const teamMap = new Map(teamDetails.map((t) => [t.id, t]));

  for (const e of entries) {
    const team = teamMap.get(e.teamId);
    rows.push({
      teamId: e.teamId,
      name: team?.name ?? "Team",
      score: e.score,
      rank: e.rank,
      eliminated: team?.eliminated ?? false,
      memberCount: team?._count.players ?? 0,
    });
  }

  return rows;
}

export async function getLeaderboard(
  gameId: string,
  offset = 0,
  count = 50
): Promise<Array<{ teamId: string; score: number; rank: number }>> {
  const key = getLeaderboardKey(gameId);
  const results = await redis.zrange(key, offset, count - 1, {
    rev: true,
    withScores: true,
  });

  const entries: Array<{ teamId: string; score: number; rank: number }> = [];
  for (let i = 0; i < results.length; i += 2) {
    entries.push({
      teamId: results[i] as string,
      score: results[i + 1] as number,
      rank: offset + (i / 2) + 1,
    });
  }

  return entries;
}

export async function getTeamScore(
  gameId: string,
  teamId: string
): Promise<number> {
  const key = getLeaderboardKey(gameId);
  const score = await redis.zscore(key, teamId);
  return score ?? 0;
}

export async function getTeamRank(
  gameId: string,
  teamId: string
): Promise<number | null> {
  const key = getLeaderboardKey(gameId);
  const rank = await redis.zrevrank(key, teamId);
  return rank !== null ? rank + 1 : null;
}

export async function removeTeamFromLeaderboard(
  gameId: string,
  teamId: string
): Promise<void> {
  const key = getLeaderboardKey(gameId);
  await redis.zrem(key, teamId);
}

export async function getLeaderboardCount(gameId: string): Promise<number> {
  const key = getLeaderboardKey(gameId);
  return redis.zcard(key);
}
