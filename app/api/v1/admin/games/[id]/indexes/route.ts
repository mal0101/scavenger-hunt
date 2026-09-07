import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiCreated, apiError, apiInternal } from "@/lib/types/api";
import { indexSchema, validateIndexEnigma } from "@/lib/utils/validation";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id: gameId } = await params;

    const indexes = await db.index.findMany({
      where: { game_id: gameId },
      include: {
        _count: { select: { scans: true } },
      },
      orderBy: { created_at: "asc" },
    });

    return apiSuccess(
      indexes.map((i: (typeof indexes)[number]) => ({
        id: i.id,
        label: i.label,
        description: i.description,
        points: i.points,
        location_name: i.location_name,
        location_lat: i.location_lat,
        location_lng: i.location_lng,
        enigma_type: i.enigma_type,
        hint: i.hint,
        sequence_order: i.sequence_order,
        scan_count: i._count.scans,
      }))
    );
  } catch (error) {
    console.error("List indexes error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to list indexes");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id: gameId } = await params;
    const body = await request.json();
    const parsed = indexSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid index data", "VALIDATION_ERROR");
    }

    const enigmaError = validateIndexEnigma(parsed.data);
    if (enigmaError) {
      return apiError(enigmaError, "VALIDATION_ERROR");
    }

    const index = await db.index.create({
      data: {
        game_id: gameId,
        label: parsed.data.label,
        description: parsed.data.description,
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

    return apiCreated({
      id: index.id,
      label: index.label,
      points: index.points,
    }, "Index created successfully");
  } catch (error) {
    console.error("Create index error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to create index");
  }
}
