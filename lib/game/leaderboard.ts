import { redis } from "@/lib/db/redis";

const LEADERBOARD_KEY_PREFIX = "leaderboard:";

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
