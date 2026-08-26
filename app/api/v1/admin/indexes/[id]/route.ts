import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiInternal, apiForbidden } from "@/lib/types/api";

function requireMentor(request: NextRequest): string | null {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");
  if (!userId || role !== "MENTOR") return null;
  return userId;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = requireMentor(request);
    if (!userId) return apiForbidden("Mentor access required");

    const { id } = await params;
    const body = await request.json();

    const index = await db.index.update({
      where: { id },
      data: {
        label: body.label,
        description: body.description,
        points: body.points,
        location_name: body.location_name,
        location_lat: body.location_lat,
        location_lng: body.location_lng,
      },
    });

    return apiSuccess({
      id: index.id,
      label: index.label,
      points: index.points,
    }, "Index updated successfully");
  } catch (error) {
    console.error("Update index error:", error);
    return apiInternal("Failed to update index");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = requireMentor(request);
    if (!userId) return apiForbidden("Mentor access required");

    const { id } = await params;

    await db.index.delete({ where: { id } });

    return apiSuccess(null, "Index deleted successfully");
  } catch (error) {
    console.error("Delete index error:", error);
    return apiInternal("Failed to delete index");
  }
}
