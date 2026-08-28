import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { requirePlayer } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const player = await db.player.findUnique({
      where: { user_id: auth.sub },
      select: { id: true },
    });

    if (!player) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    const scans = await db.scan.findMany({
      where: { player_id: player.id },
      include: {
        index: {
          select: { label: true, location_name: true },
        },
      },
      orderBy: { scanned_at: "desc" },
      take: 100,
    });

    const pointsTotal = scans.reduce((sum, s) => sum + s.points_earned, 0);

    return apiSuccess({
      total: scans.length,
      total_points: pointsTotal,
      scans: scans.map((s) => ({
        id: s.id,
        index_id: s.index_id,
        index_label: s.index.label,
        location_name: s.index.location_name,
        points_earned: s.points_earned,
        scanned_at: s.scanned_at,
        round_id: s.round_id,
      })),
    });
  } catch (error) {
    console.error(
      "Get player scans error:",
      error instanceof Error ? error.message : "unknown"
    );
    return apiInternal("Failed to get scan history");
  }
}
