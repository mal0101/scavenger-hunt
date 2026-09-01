import { redis } from "@/lib/db/redis";

export function getGameChannel(gameId: string): string {
  return `game:${gameId}:events`;
}

export async function publishEvent(
  gameId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const channel = getGameChannel(gameId);
    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });
    await redis.publish(channel, payload);
  } catch {
    console.warn(`[PubSub] Failed to publish event "${event}" for game ${gameId}`);
  }
}
