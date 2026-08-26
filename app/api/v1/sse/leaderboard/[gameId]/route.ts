import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { redis } from "@/lib/db/redis";
import { GAME_CONSTANTS } from "@/lib/utils/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const token =
    request.cookies.get("access_token")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await verifyAccessToken(token);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { gameId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", game_id: gameId });

      const heartbeat = setInterval(() => {
        try {
          send({ type: "heartbeat", timestamp: new Date().toISOString() });
        } catch {
          clearInterval(heartbeat);
        }
      }, GAME_CONSTANTS.SSE_HEARTBEAT_INTERVAL);

      const pollLeaderboard = async () => {
        try {
          const key = `leaderboard:${gameId}`;
          const entries = await redis.zrange(key, 0, -1, {
            withScores: true,
            rev: true,
          });

          const teams: Array<{ rank: number; team_id: string; score: number }> =
            [];
          let rank = 1;
          for (let i = 0; i < entries.length; i += 2) {
            teams.push({
              rank,
              team_id: entries[i] as string,
              score: entries[i + 1] as number,
            });
            rank++;
          }

          send({ type: "leaderboard", teams, timestamp: new Date().toISOString() });
        } catch (err) {
          console.error("SSE leaderboard poll error:", err);
        }
      };

      const pollInterval = setInterval(pollLeaderboard, 5000);
      pollLeaderboard();

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
