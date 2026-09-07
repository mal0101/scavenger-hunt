import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiInternal, apiNotFound } from "@/lib/types/api";
import { requireMentor } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMentor(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const team = await db.team.findUnique({
      where: { id },
      include: {
        captain: { select: { id: true, user: { select: { username: true, nickname: true } } } },
        players: {
          include: {
            user: { select: { id: true, username: true, nickname: true } },
          },
        },
        scans: {
          include: {
            index: { select: { id: true, label: true, points: true } },
          },
          orderBy: { scanned_at: "desc" },
        },
      },
    });

    if (!team) return apiNotFound("Team not found");

    return apiSuccess({
      id: team.id,
      name: team.name,
      invite_code: team.invite_code,
      total_score: team.total_score,
      eliminated: team.eliminated,
      captain_id: team.captain_id,
      captain_username: team.captain?.user.username ?? null,
      member_count: team.players.length,
      players: team.players.map((p) => ({
        id: p.user.id,
        username: p.user.username,
        nickname: p.user.nickname,
        status: p.status,
        total_score: p.total_score,
      })),
      scans: team.scans.map((s) => ({
        id: s.id,
        index_label: s.index.label,
        index_points: s.index.points,
        points_earned: s.points_earned,
        scanned_at: s.scanned_at,
        gps_lat: s.gps_lat,
        gps_lng: s.gps_lng,
      })),
      recent_scans: team.scans.length,
    });
  } catch (error) {
    console.error("Get team telemetry error:", error instanceof Error ? error.message : "unknown");
    return apiInternal("Failed to get team telemetry");
  }
}
