import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal, apiNotFound } from "@/lib/types/api";
import { gameSchema } from "@/lib/utils/validation";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const game = await db.game.findUnique({
      where: { id },
      include: {
        rounds: { orderBy: { round_number: "asc" } },
        indexes: true,
        teams: {
          include: { _count: { select: { players: true } } },
        },
        _count: { select: { teams: true } },
      },
    });

    if (!game) return apiNotFound("Game not found");

    const teams = [...game.teams]
      .sort((a, b) => b.total_score - a.total_score)
      .map((t, i) => ({
        id: t.id,
        name: t.name,
        total_score: t.total_score,
        eliminated: t.eliminated,
        member_count: t._count.players,
        rank: i + 1,
      }));

    return apiSuccess({
      id: game.id,
      title: game.title,
      description: game.description,
      status: game.status,
      max_rounds: game.max_rounds,
      round_duration: game.round_duration,
      elimination_pct: game.elimination_pct,
      team_count: game._count.teams,
      teams,
      rounds: game.rounds.map((r) => ({
        id: r.id,
        round_number: r.round_number,
        status: r.status,
        started_at: r.started_at,
      })),
      indexes: game.indexes.map((i) => ({
        id: i.id,
        label: i.label,
        description: i.description,
        points: i.points,
        location_name: i.location_name,
        enigma_type: i.enigma_type,
        hint: i.hint,
        sequence_order: i.sequence_order,
      })),
    });
  } catch (error) {
    console.error("Get game error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to get game");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const body = await request.json();
    const parsed = gameSchema.partial().safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid game data", "VALIDATION_ERROR");
    }

    const game = await db.game.findUnique({ where: { id } });
    if (!game) return apiNotFound("Game not found");

    const updated = await db.game.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess(
      {
        id: updated.id,
        title: updated.title,
        status: updated.status,
      },
      "Game updated successfully"
    );
  } catch (error) {
    console.error("Update game error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to update game");
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

    const game = await db.game.findUnique({ where: { id } });
    if (!game) return apiNotFound("Game not found");

    await db.game.delete({ where: { id } });

    return apiSuccess(null, "Game deleted successfully");
  } catch (error) {
    console.error("Delete game error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to delete game");
  }
}
