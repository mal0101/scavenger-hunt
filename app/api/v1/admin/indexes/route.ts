import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiCreated, apiError, apiInternal, apiNotFound } from "@/lib/types/api";
import { indexSchema, validateIndexEnigma } from "@/lib/utils/validation";
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
        _count: { select: { scans: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return apiSuccess(
      indexes.map((idx) => ({
        id: idx.id,
        game_id: idx.game_id,
        game_title: idx.game.title,
        label: idx.label,
        description: idx.description,
        display_code: idx.display_code,
        points: idx.points,
        location_name: idx.location_name,
        enigma_type: idx.enigma_type,
        question: idx.question,
        hint: idx.hint,
        sequence_order: idx.sequence_order,
        scan_count: idx._count.scans,
      }))
    );
  } catch (error) {
    console.error("List indexes error:", error instanceof Error ? error.message : "unknown");
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

    const enigmaError = validateIndexEnigma(parsed.data);
    if (enigmaError) {
      return apiError(enigmaError, "VALIDATION_ERROR");
    }

    const game = await db.game.findUnique({
      where: { id: parsed.data.game_id },
    });
    if (!game) return apiNotFound("Game not found");

    const index = await db.index.create({
      data: {
        game_id: parsed.data.game_id,
        label: parsed.data.label,
        description: parsed.data.description,
        display_code: parsed.data.display_code,
        points: parsed.data.points,
        location_name: parsed.data.location_name,
        location_lat: parsed.data.location_lat,
        location_lng: parsed.data.location_lng,
        enigma_type: parsed.data.enigma_type,
        question: parsed.data.question,
        answer: parsed.data.answer,
        hint: parsed.data.hint,
        sequence_order: parsed.data.sequence_order,
        answer_options: parsed.data.answer_options
          ? JSON.stringify(parsed.data.answer_options.map((o) => o.trim()))
          : undefined,
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
    console.error("Create index error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to create index");
  }
}
