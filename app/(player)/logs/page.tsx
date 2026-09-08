"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import type {
  ActiveGameView,
  PlayerMeView,
  TeamScanLedger,
} from "@/lib/types/api-responses";

export default function LogsPage() {
  const [scans, setScans] = useState<TeamScanLedger["scans"]>([]);
  const [scanTotal, setScanTotal] = useState(0);
  const [team, setTeam] = useState<TeamScanLedger["team"]>(null);
  const [myTotal, setMyTotal] = useState(0);
  const [game, setGame] = useState<ActiveGameView | null>(null);
  const [player, setPlayer] = useState<PlayerMeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [scansRes, gameRes, playerRes] = await Promise.all([
        apiFetch<{ success: boolean; data?: TeamScanLedger }>(
          "/api/v1/players/me/scans"
        ),
        apiFetch<{ success: boolean; data: ActiveGameView | null }>("/api/v1/games/active"),
        apiFetch<{ success: boolean; data: PlayerMeView }>("/api/v1/players/me"),
      ]);
      if (scansRes.success && scansRes.data) {
        setScans(scansRes.data.scans);
        setScanTotal(scansRes.data.total);
        setTeam(scansRes.data.team);
        setMyTotal(
          scansRes.data.mine?.total_points ?? scansRes.data.total_points
        );
      }
      if (gameRes.success && gameRes.data) setGame(gameRes.data);
      if (playerRes.success) setPlayer(playerRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scan history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="px-4 space-y-6 max-w-lg mx-auto pt-2">
        <div className="text-center space-y-1">
          <h1 className="font-headline text-headline-lg-mobile text-on-surface etched-text">
            Team Scan Log
          </h1>
        </div>
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-1 mt-2">
        <h1 className="font-headline text-headline-lg-mobile text-on-surface etched-text">
          Team Scan Log
        </h1>
        <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
          {team
            ? `${team.name} — ${game ? `Round ${game.current_round}` : "Team history"}`
            : game
              ? `Round ${game.current_round} — ${game.title}`
              : "Scan history"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
          <p className="font-headline text-2xl text-primary font-bold">
            {loading ? "--" : team ? team.total_score : player?.total_score ?? 0}
          </p>
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Team Score
          </p>
        </div>
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
          <p className="font-headline text-2xl text-primary font-bold">
            {loading ? "--" : scanTotal}
          </p>
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Markers
          </p>
        </div>
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
          <p className="font-headline text-2xl text-primary font-bold">
            {loading ? "--" : myTotal}
          </p>
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            My Points
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-4 text-center">
            <p className="font-body text-body-md text-on-surface-variant animate-pulse">
              Loading scan history...
            </p>
          </div>
        ) : scans.length === 0 ? (
          <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-4 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-2 block">
              qr_code_scanner
            </span>
            <p className="font-body text-body-md text-on-surface-variant">
              No scans yet in this round.
            </p>
            <p className="font-label text-label-sm text-outline mt-1">
              Scan a QR checkpoint to get started
            </p>
          </div>
        ) : (
          scans.map((scan) => (
            <div
              key={scan.id}
              className="bg-surface-container rounded-lg border border-outline-variant/30 p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-container/20 border border-primary/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">
                  qr_code
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-headline text-sm text-on-surface truncate">
                    {scan.index_label}
                  </p>
                  {scan.mine && (
                    <span className="shrink-0 rounded-full bg-primary-container border border-primary/30 px-2 py-0.5 font-label text-label-xs text-primary">
                      You
                    </span>
                  )}
                </div>
                <p className="font-label text-label-sm text-on-surface-variant truncate">
                  {scan.scanned_by?.nickname ??
                    scan.scanned_by?.username ??
                    (scan.mine ? "You" : "Team member")}
                  {" · "}
                  {new Date(scan.scanned_at).toLocaleTimeString()}
                  {scan.location_name && ` · ${scan.location_name}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-headline text-lg text-primary font-bold">
                  {scan.points_earned > 0 ? "+" + scan.points_earned : scan.points_earned}
                </p>
                <p className="font-label text-label-sm text-on-surface-variant">
                  pts
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}