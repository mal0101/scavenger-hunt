import { NextRequest } from "next/server";
import { db } from "@/lib/db/postgres";
import { apiSuccess, apiError, apiInternal } from "@/lib/types/api";
import { requirePlayer } from "@/lib/auth/guard";

// Scans are attributed to the TEAM: this endpoint returns the history of the
// player's team (every marker any member scanned), naming the player who made
// each scan, so the hunting log reads as a team ledger. A player without a
// team falls back to their own personal scan history.
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlayer(request);
    if (auth instanceof Response) return auth;

    const player = await db.player.findUnique({
      where: { user_id: auth.sub },
      select: { id: true, team_id: true },
    });

    if (!player) {
      return apiError("Player profile not found", "NOT_FOUND", 404);
    }

    const scanInclude = {
      index: {
        select: { label: true, location_name: true },
      },
      player: {
        select: {
          id: true,
          user: { select: { username: true, nickname: true } },
        },
      },
    } as const;

    if (player.team_id) {
      const [scans, team] = await Promise.all([
        db.scan.findMany({
          where: { team_id: player.team_id },
          include: scanInclude,
          orderBy: { scanned_at: "desc" },
          take: 200,
        }),
        db.team.findUnique({
          where: { id: player.team_id },
          select: {
            id: true,
            name: true,
            total_score: true,
            _count: { select: { players: true } },
          },
        }),
      ]);

      const teamPoints = scans.reduce((sum, s) => sum + s.points_earned, 0);
      const mine = scans.filter((s) => s.player_id === player.id);
      const myPoints = mine.reduce((sum, s) => sum + s.points_earned, 0);

      return apiSuccess({
        total: scans.length,
        total_points: teamPoints,
        mine: {
          total: mine.length,
          total_points: myPoints,
        },
        team: team
          ? {
              id: team.id,
              name: team.name,
              total_score: team.total_score,
              member_count: team._count.players,
            }
          : null,
        scans: scans.map((s) => ({
          id: s.id,
          index_id: s.index_id,
          index_label: s.index.label,
          location_name: s.index.location_name,
          points_earned: s.points_earned,
          scanned_at: s.scanned_at,
          round_id: s.round_id,
          scanned_by: s.player.user
            ? {
                username: s.player.user.username,
                nickname: s.player.user.nickname,
              }
            : null,
          mine: s.player_id === player.id,
        })),
      });
    }

    const scans = await db.scan.findMany({
      where: { player_id: player.id },
      include: scanInclude,
      orderBy: { scanned_at: "desc" },
      take: 100,
    });

    const pointsTotal = scans.reduce((sum, s) => sum + s.points_earned, 0);

    return apiSuccess({
      total: scans.length,
      total_points: pointsTotal,
      team: null,
      scans: scans.map((s) => ({
        id: s.id,
        index_id: s.index_id,
        index_label: s.index.label,
        location_name: s.index.location_name,
        points_earned: s.points_earned,
        scanned_at: s.scanned_at,
        round_id: s.round_id,
        scanned_by: null,
        mine: true,
      })),
    });
  } catch (error) {
    console.error(
      "Get scan history error:",
      error instanceof Error ? error.message : "unknown"
    );
    return apiInternal("Failed to get scan history");
  }
}