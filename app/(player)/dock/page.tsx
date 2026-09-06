"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  passed_challenges: number;
  team_rank: number | null;
  team: {
    id: string;
    name: string;
    invite_code: string;
    total_score: number;
  } | null;
}

export default function DockPage() {
  const router = useRouter();
  const [game, setGame] = useState<GameData | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const redirectedRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const [gameRes, playerRes] = await Promise.all([
          apiFetch<{ success: boolean; data: GameData | null }>("/api/v1/games/active"),
          apiFetch<{ success: boolean; data: PlayerData }>("/api/v1/players/me"),
        ]);
        if (gameRes.success && gameRes.data) setGame(gameRes.data);
        if (playerRes.success) {
          setPlayer(playerRes.data);
          // M5: a player with no team is sent to team creation/join instead of
          // landing on the dock directly.
          if (!playerRes.data.team && !redirectedRef.current) {
            redirectedRef.current = true;
            router.replace("/team");
            return;
          }
        }
      } catch (err) {
        console.error("Dock load error:", err instanceof Error ? err.message : err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const objective = game
    ? `Round ${game.current_round} of ${game.title}`
    : "No active hunt in progress";
  const teamName = player?.team?.name ?? "No team";
  const teamScore = player?.team?.total_score ?? 0;

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="glass-panel rounded-xl p-5 space-y-3 mt-2 relative overflow-hidden ambient-glow">
        <div className="absolute top-3 right-5 opacity-40 animate-gear-slow pointer-events-none" aria-hidden="true">
          <span className="material-symbols-outlined text-primary text-4xl">settings</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg animate-flicker-amber" aria-hidden="true">
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
        <div className="engraved-separator my-1" />
        <div className="flex items-center gap-2 pt-1">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">explore</span>
          <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest animate-pulse">
            Locating: Casablanca Coast
          </span>
        </div>
      </div>

      <div className="wood-grain rounded-xl p-5 space-y-4 brass-plate">
        <h3 className="font-headline text-headline-lg-mobile text-on-surface pb-2 text-primary">
          Your Status
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="brass-plate rounded-lg p-3 text-center">
            <p className="font-headline text-2xl text-primary font-bold etched-text">
              {loading ? "--" : teamScore}
            </p>
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Score
            </p>
          </div>
          <div className="brass-plate rounded-lg p-3 text-center">
            <p className="font-headline text-2xl text-primary font-bold etched-text">
              {loading ? "--" : player?.team_rank ? `#${player.team_rank}` : "—"}
            </p>
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Team Rank
            </p>
          </div>
          <div className="brass-plate rounded-lg p-3 text-center">
            <p className="font-headline text-2xl text-primary font-bold etched-text">
              {loading ? "--" : player?.passed_challenges ?? 0}
            </p>
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Passed
            </p>
          </div>
          <div className="brass-plate rounded-lg p-3 text-center">
            <p className="font-headline text-lg text-on-surface font-bold truncate">
              {loading ? "..." : teamName}
            </p>
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Team
            </p>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Steam Pressure
            </span>
            <span className="font-headline text-sm text-primary font-bold">
              {loading ? "--" : Math.min(100, teamScore)}%
            </span>
          </div>
          <div className="tube-track h-4">
            <div
              className="tube-fill"
              style={{ width: `${loading ? 0 : Math.min(100, teamScore)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-surface-container border-t-2 border-primary-container border-x border-b border-outline-variant/50 rounded-xl p-5">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary text-sm">tune</span>
          <h3 className="font-label text-label-sm uppercase text-on-surface-variant text-center tracking-widest">
            Quick Actions
          </h3>
          <span className="material-symbols-outlined text-primary text-sm">tune</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/scan"
            className="flex flex-col items-center gap-2 p-4 bg-primary-container/10 border border-primary/30 rounded-lg hover:bg-primary-container/20 transition-all hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] group"
          >
            <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">
              qr_code_scanner
            </span>
            <span className="font-label text-label-sm text-primary font-bold uppercase">
              Scan QR
            </span>
          </a>
          <a
            href="/team"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              groups
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Team
            </span>
          </a>
          <a
            href="/leaderboard"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              leaderboard
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Leaderboard
            </span>
          </a>
          <a
            href="/vault"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              lock_open
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Vault
            </span>
          </a>
          <a
            href="/logs"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              history_edu
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Logs
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
