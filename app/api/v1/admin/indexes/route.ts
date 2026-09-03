import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiCreated, apiError, apiInternal, apiNotFound } from "@/lib/types/api";
import { indexSchema } from "@/lib/utils/validation";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const gameId = url.searchParams.get("game_id");

    const where = gameId ? { game_id: gameId } : {};

    const indexes = await db.index.findMany({
      where,
      include: {
        game: { select: { id: true, title: true } },
        round: { select: { id: true, round_number: true } },
        _count: { select: { scans: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return apiSuccess(
      indexes.map((idx) => ({
        id: idx.id,
        game_id: idx.game_id,
        game_title: idx.game.title,
        round_id: idx.round_id,
        round_number: idx.round?.round_number ?? null,
        label: idx.label,
        description: idx.description,
        points: idx.points,
        location_name: idx.location_name,
        enigma_type: idx.enigma_type,
        scan_count: idx._count.scans,
      }))
    );
  } catch (error) {
    console.error("List indexes error:", error);
    return apiInternal("Failed to list indexes");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = indexSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid index data", "VALIDATION_ERROR");
    }

    const game = await db.game.findUnique({
      where: { id: parsed.data.game_id },
    });
    if (!game) return apiNotFound("Game not found");

    // If no round was specified, assign the game's active round so the
    // index is immediately ready for QR generation.
    let roundId = parsed.data.round_id ?? null;
    if (!roundId) {
      const activeRound = await db.round.findFirst({
        where: { game_id: parsed.data.game_id, status: "ACTIVE" },
        select: { id: true },
      });
      roundId = activeRound?.id ?? null;
    }

    const index = await db.index.create({
      data: {
        game_id: parsed.data.game_id,
        round_id: roundId,
        label: parsed.data.label,
        description: parsed.data.description,
        points: parsed.data.points,
        location_name: parsed.data.location_name,
        location_lat: parsed.data.location_lat,
        location_lng: parsed.data.location_lng,
        enigma_type: parsed.data.enigma_type,
      },
    });

    return apiCreated(
      {
        id: index.id,
        label: index.label,
        points: index.points,
      },
      "Index created successfully"
    );
  } catch (error) {
    console.error("Create index error:", error);
    return apiInternal("Failed to create index");
  }
}
