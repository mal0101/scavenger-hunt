"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface ScanEntry {
  id: string;
  index_label: string;
  points_earned: number;
  scanned_at: string;
  location_name?: string | null;
}

interface GameData {
  id: string;
  title: string;
  current_round: number;
}

interface PlayerData {
  total_score: number;
  team: { total_score: number } | null;
}

export default function LogsPage() {
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [scanTotal, setScanTotal] = useState(0);
  const [pointTotal, setPointTotal] = useState(0);
  const [game, setGame] = useState<GameData | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [scansRes, gameRes, playerRes] = await Promise.all([
          apiFetch<{ success: boolean; data?: { scans: ScanEntry[]; total: number; total_points: number } }>(
            "/api/v1/players/me/scans"
          ),
          apiFetch<{ success: boolean; data: GameData | null }>("/api/v1/games/active"),
          apiFetch<{ success: boolean; data: PlayerData }>("/api/v1/players/me"),
        ]);
        if (scansRes.success && scansRes.data) {
          setScans(scansRes.data.scans);
          setScanTotal(scansRes.data.total);
          setPointTotal(scansRes.data.total_points);
        }
        if (gameRes.success && gameRes.data) setGame(gameRes.data);
        if (playerRes.success) setPlayer(playerRes.data);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalPoints = pointTotal;


  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-1 mt-2">
        <h1 className="font-headline text-headline-lg-mobile text-on-surface">
          Scan Logs
        </h1>
        <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
          {game ? `Round ${game.current_round} — ${game.title}` : "Scan history"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
          <p className="font-headline text-2xl text-primary font-bold">
            {loading ? "--" : scanTotal}
          </p>
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Scans
          </p>
        </div>
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
          <p className="font-headline text-2xl text-primary font-bold">
            {loading ? "--" : totalPoints}
          </p>
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Points
          </p>
        </div>
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
          <p className="font-headline text-2xl text-primary font-bold">
            {loading ? "--" : player?.total_score ?? 0}
          </p>
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Total
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
                <p className="font-headline text-sm text-on-surface truncate">
                  {scan.index_label}
                </p>
                <p className="font-label text-label-sm text-on-surface-variant">
                  {new Date(scan.scanned_at).toLocaleTimeString()}
                  {scan.location_name && ` · ${scan.location_name}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-headline text-lg text-primary font-bold">
                  +{scan.points_earned}
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
