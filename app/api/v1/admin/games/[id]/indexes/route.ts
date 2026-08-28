import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiCreated, apiError, apiInternal } from "@/lib/types/api";
import { indexSchema } from "@/lib/utils/validation";
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
        scan_count: i._count.scans,
      }))
    );
  } catch (error) {
    console.error("List indexes error:", error);
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

    const index = await db.index.create({
      data: {
        game_id: gameId,
        label: parsed.data.label,
        description: parsed.data.description,
        points: parsed.data.points,
        location_name: parsed.data.location_name,
        location_lat: parsed.data.location_lat,
        location_lng: parsed.data.location_lng,
      },
    });

    return apiCreated({
      id: index.id,
      label: index.label,
      points: index.points,
    }, "Index created successfully");
  } catch (error) {
    console.error("Create index error:", error);
    return apiInternal("Failed to create index");
  }
}
