import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { requireMentor } from "@/lib/auth/guard";
import { indexSchema } from "@/lib/utils/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const body = await request.json();

    const parsed = indexSchema.partial().safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid index data", "VALIDATION_ERROR");
    }

    const index = await db.index.update({
      where: { id },
      data: {
        ...(parsed.data.label !== undefined && { label: parsed.data.label }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.points !== undefined && { points: parsed.data.points }),
        ...(parsed.data.location_name !== undefined && { location_name: parsed.data.location_name }),
        ...(parsed.data.location_lat !== undefined && { location_lat: parsed.data.location_lat }),
        ...(parsed.data.location_lng !== undefined && { location_lng: parsed.data.location_lng }),
        ...(parsed.data.enigma_type !== undefined && { enigma_type: parsed.data.enigma_type }),
        ...(parsed.data.question !== undefined && { question: parsed.data.question }),
        ...(parsed.data.answer !== undefined && { answer: parsed.data.answer }),
      },
    });

    return apiSuccess({
      id: index.id,
      label: index.label,
      points: index.points,
    }, "Index updated successfully");
  } catch (error) {
    console.error("Update index error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to update index");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    await db.index.delete({ where: { id } });

    return apiSuccess(null, "Index deleted successfully");
  } catch (error) {
    console.error("Delete index error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to delete index");
  }
}
