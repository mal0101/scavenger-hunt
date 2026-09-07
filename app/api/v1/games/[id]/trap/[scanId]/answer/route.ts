import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { publishEvent } from "@/lib/db/pubsub";
import { redis } from "@/lib/db/redis";
import { requirePlayer } from "@/lib/auth/guard";
import { checkRateLimit, generalLimiter } from "@/lib/utils/rate-limiter";
import { parseAnswerOptions } from "@/lib/utils/validation";

const answerSchema = z.object({
  answer: z.string().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scanId: string }> }
) {
  try {
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const rateLimitResult = await checkRateLimit(generalLimiter, auth.sub);
    if (!rateLimitResult.success) {
      return apiError("Too many submissions. Please wait.", "RATE_LIMITED", 429);
    }

    const { id: gameId, scanId } = await params;
    const body = await request.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Answer is required", "VALIDATION_ERROR");
    }

    const scan = await db.scan.findUnique({
      where: { id: scanId },
      include: { index: true, team: true },
    });

    if (!scan || scan.game_id !== gameId) {
      return apiError("Scan not found for this game", "NOT_FOUND", 404);
    }
    if (scan.player_id !== auth.sub) {
      const player = await db.player.findUnique({ where: { user_id: auth.sub } });
      if (!player || scan.player_id !== player.id) {
        return apiError("This scan belongs to another player", "FORBIDDEN", 403);
      }
    }
    if (scan.resolved) {
      return apiError("This trap has already been resolved", "TRAP_ALREADY_RESOLVED");
    }
    if (!scan.team_id) {
      return apiError("You must be in a team to answer a trap", "NO_TEAM");
    }
    if (scan.index.enigma_type !== "trap" || !scan.index.question || !scan.index.answer) {
      return apiError("This index is not a trap with a question", "NOT_A_TRAP");
    }
    const scanTeam = await db.team.findUnique({
      where: { id: scan.team_id },
      select: { eliminated: true },
    });
    if (scanTeam?.eliminated) {
      return apiError("This team has been eliminated and cannot play", "TEAM_ELIMINATED");
    }

    const answerText = parsed.data.answer.trim();
    const expected = scan.index.answer?.trim().toLowerCase() ?? "";

    // QCM traps carry a fixed set of options; the submitted answer must be one
    // of them (case-insensitive) when options are present.
    const options = parseAnswerOptions(scan.index.answer_options);
    if (
      options &&
      !options.some((o) => o.trim().toLowerCase() === answerText.toLowerCase())
    ) {
      return apiError(
        "The answer must be one of the proposed options",
        "ANSWER_NOT_OPTION"
      );
    }

    const correct = answerText.toLowerCase() === expected;

    // Traps are pure penalties: a wrong answer costs the full points at risk,
    // a correct answer only half of it (the player "seals the breach" early).
    const pointDelta = correct
      ? -Math.round(scan.index.points * 0.5)
      : -scan.index.points;

    const [, , team] = await db.$transaction([
      db.scan.update({
        where: { id: scan.id },
        data: { points_earned: pointDelta, resolved: true },
      }),
      db.player.update({
        where: { id: scan.player_id },
        data: { total_score: { increment: pointDelta } },
      }),
      db.team.update({
        where: { id: scan.team_id },
        data: { total_score: { increment: pointDelta } },
      }),
    ]);

    if (team) {
      try {
        await redis.zadd(`leaderboard:${gameId}`, {
          score: team.total_score,
          member: team.id,
        });
      } catch (error) {
        console.warn(
          `[Trap] Redis leaderboard sync skipped for team ${team.id}:`,
          error instanceof Error ? error.message : "unknown"
        );
      }
    }

    await publishEvent(gameId, "leaderboard", {
      type: "trap",
      team_id: scan.team_id,
      correct,
      delta: pointDelta,
      total_score: team?.total_score ?? 0,
    });

    return apiSuccess(
      {
        scan_id: scan.id,
        correct,
        delta: pointDelta,
        points_earned: pointDelta,
        team_total: team?.total_score ?? 0,
      },
      correct ? "Trap avoided" : "Trap sprung"
    );
  } catch (error) {
    console.error(
      "Trap answer error:",
      error instanceof Error ? error.message : "unknown"
    );
    return apiInternal("Failed to process trap answer");
  }
}