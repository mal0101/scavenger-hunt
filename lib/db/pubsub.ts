import { redis } from "@/lib/db/redis";

export function getGameChannel(gameId: string): string {
  return `game:${gameId}:events`;
}

export async function publishEvent(
  gameId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const channel = getGameChannel(gameId);
  const payload = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });
  try {
    await redis.publish(channel, payload);
  } catch (err) {
    // Pub/sub for live UI is best-effort; never fail the underlying operation.
    console.warn(
      "[pubsub] publish skipped:",
      err instanceof Error ? err.message : err
    );
  }
}
