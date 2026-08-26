import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiInternal } from "@/lib/types/api";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id: gameId } = await params;

    const teams = await db.team.findMany({
      where: { game_id: gameId },
      include: {
        players: true,
        scans: {
          orderBy: { scanned_at: "desc" },
          take: 1,
          include: {
            index: { select: { id: true, label: true } },
          },
        },
      },
      orderBy: { total_score: "desc" },
    });

    return apiSuccess(
      teams.map((t, idx) => ({
        rank: idx + 1,
        id: t.id,
        name: t.name,
        invite_code: t.invite_code,
        total_score: t.total_score,
        eliminated: t.eliminated,
        member_count: t.players.length,
        members: t.players.map((p) => ({
          id: p.id,
          total_score: p.total_score,
          status: p.status,
        })),
        last_scan: t.scans[0]
          ? {
              index_label: t.scans[0].index.label,
              points_earned: t.scans[0].points_earned,
              at: t.scans[0].scanned_at,
            }
          : null,
      }))
    );
  } catch (error) {
    console.error("List teams error:", error);
    return apiInternal("Failed to list teams");
  }
}
