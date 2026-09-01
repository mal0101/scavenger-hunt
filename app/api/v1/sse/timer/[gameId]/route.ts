import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/postgres";
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

      const pollTimer = async () => {
        try {
          const game = await db.game.findUnique({ where: { id: gameId } });
          if (!game) return;

          const activeRound = await db.round.findFirst({
            where: { game_id: gameId, status: "ACTIVE" },
          });

          if (!activeRound) {
            send({
              type: "timer",
              status: game.status,
              round: null,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          const elapsed = Math.floor(
            (Date.now() - activeRound.started_at!.getTime()) / 1000
          );
          const remaining = Math.max(0, game.round_duration - elapsed);

          send({
            type: "timer",
            status: game.status,
            round: {
              id: activeRound.id,
              number: activeRound.round_number,
              elapsed,
              remaining,
              total: game.round_duration,
              expired: remaining <= 0,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error("SSE timer poll error:", err);
        }
      };

      const pollInterval = setInterval(pollTimer, GAME_CONSTANTS.TIMER_SYNC_INTERVAL);
      pollTimer();

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
