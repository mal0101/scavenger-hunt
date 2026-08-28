"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface GameData {
  id: string;
  title: string;
  status: string;
  current_round: number;
  round_count: number;
  team_count: number;
  current_round_id: string | null;
}

interface PlayerData {
  id: string;
  nickname: string | null;
  total_score: number;
  team: {
    id: string;
    name: string;
    invite_code: string;
    total_score: number;
  } | null;
}

export default function DockPage() {
  const [game, setGame] = useState<GameData | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [gameRes, playerRes] = await Promise.all([
          apiFetch<{ success: boolean; data: GameData | null }>("/api/v1/games/active"),
          apiFetch<{ success: boolean; data: PlayerData }>("/api/v1/players/me"),
        ]);
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

  const objective = game
    ? `Round ${game.current_round} of ${game.title}`
    : "No active hunt in progress";
  const teamName = player?.team?.name ?? "No team";
  const teamScore = player?.team?.total_score ?? 0;

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="glass-panel arch-top rounded-xl p-5 space-y-3 mt-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">
            radar
          </span>
          <span className="font-label text-label-sm text-primary uppercase tracking-widest">
            Current Objective
          </span>
        </div>
        <h2 className="font-headline text-headline-lg-mobile text-on-surface">
          {loading ? "Loading..." : objective}
        </h2>
        {game?.status === "ACTIVE" && (
          <div className="flex items-center gap-2 pt-1">
            <div className="px-3 py-1 bg-primary-container/20 border border-primary/30 rounded-full flex items-center gap-2 animate-pulse-border">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label text-label-sm text-primary">
                Round {game.current_round} Active
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-5 space-y-4">
        <h3 className="font-headline text-headline-lg-mobile text-on-surface border-b border-outline-variant/30 pb-2">
          Your Status
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
            <p className="font-headline text-2xl text-primary font-bold">
              {loading ? "--" : teamScore}
            </p>
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Score
            </p>
          </div>
          <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-3 text-center">
            <p className="font-headline text-lg text-on-surface font-bold truncate">
              {loading ? "..." : teamName}
            </p>
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Team
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container border-t-2 border-primary-container border-x border-b border-outline-variant/50 rounded-xl p-5">
        <h3 className="font-label text-label-sm uppercase text-on-surface-variant mb-4 text-center tracking-widest border-b border-outline-variant/20 pb-2 border-dashed">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/scan"
            className="flex flex-col items-center gap-2 p-4 bg-primary-container/10 border border-primary/30 rounded-lg hover:bg-primary-container/20 transition-all"
          >
            <span className="material-symbols-outlined text-primary text-2xl">
              qr_code_scanner
            </span>
            <span className="font-label text-label-sm text-primary font-bold uppercase">
              Scan QR
            </span>
          </a>
          <a
            href="/leaderboard"
            className="flex flex-col items-center gap-2 p-4 bg-surface-container-high border border-outline-variant/30 rounded-lg hover:bg-surface-container-highest transition-all"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl">
              leaderboard
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase">
              Leaderboard
            </span>
          </a>
          <a
            href="/vault"
            className="flex flex-col items-center gap-2 p-4 bg-surface-container-high border border-outline-variant/30 rounded-lg hover:bg-surface-container-highest transition-all"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl">
              lock_open
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase">
              Vault
            </span>
          </a>
          <a
            href="/logs"
            className="flex flex-col items-center gap-2 p-4 bg-surface-container-high border border-outline-variant/30 rounded-lg hover:bg-surface-container-highest transition-all"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl">
              history_edu
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase">
              Logs
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
