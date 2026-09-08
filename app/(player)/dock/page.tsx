"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import type { ActiveGameView, PlayerMeView } from "@/lib/types/api-responses";

export default function DockPage() {
  const router = useRouter();
  const [game, setGame] = useState<ActiveGameView | null>(null);
  const [player, setPlayer] = useState<PlayerMeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gameRes, playerRes] = await Promise.all([
        apiFetch<{ success: boolean; data: ActiveGameView | null }>("/api/v1/games/active"),
        apiFetch<{ success: boolean; data: PlayerMeView }>("/api/v1/players/me"),
      ]);
      if (gameRes.success && gameRes.data) setGame(gameRes.data);
      if (playerRes.success) {
        setPlayer(playerRes.data);
        if (!playerRes.data.team && !redirectedRef.current) {
          redirectedRef.current = true;
          router.replace("/team");
          return;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const objective = game
    ? `Round ${game.current_round} of ${game.title}`
    : "No active hunt in progress";
  const teamName = player?.team?.name ?? "No team";
  const teamScore = player?.team?.total_score ?? 0;
  const teamCount = game?.team_count ?? 1;
  const pressurePct = teamCount > 0
    ? Math.min(100, Math.round(((teamCount - (player?.team_rank ?? teamCount)) / teamCount) * 100))
    : 0;

  if (error) {
    return (
      <div className="px-4 space-y-6 max-w-lg mx-auto">
        <div className="bg-error-container/10 border border-error/40 rounded-xl p-8 text-center mt-2">
          <span className="material-symbols-outlined text-error text-4xl mb-3 block">
            error_outline
          </span>
          <p className="font-headline text-lg text-on-surface mb-2">
            Failed to Load Dock
          </p>
          <p className="font-body text-body-md text-on-surface-variant mb-4">
            {error || "There was a problem connecting to the vault."}
          </p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Retry
          </button>
        </div>
      </div>
    );
  }

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
          <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
            {game ? `${game.title} — Sector ${game.current_round}` : "Awaiting Hunt Coordinates"}
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
              {loading ? "--" : teamCount > 0 ? `${player?.team_rank ?? teamCount}/${teamCount}` : "--"}
            </span>
          </div>
          <div className="tube-track h-4">
            <div
              className="tube-fill"
              style={{ width: `${loading ? 0 : pressurePct}%` }}
            />
          </div>
          <p className="font-label text-label-sm text-on-surface-variant mt-1">
            {loading
              ? "Calculating position..."
              : player?.team_rank
                ? `Rank ${player.team_rank} of ${teamCount} teams — ${pressurePct}% to the top`
                : "Joining teams..."}
          </p>
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
          <Link
            href="/scan"
            className="flex flex-col items-center gap-2 p-4 bg-primary-container/10 border border-primary/30 rounded-lg hover:bg-primary-container/20 transition-all hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] group"
          >
            <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">
              qr_code_scanner
            </span>
            <span className="font-label text-label-sm text-primary font-bold uppercase">
              Scan QR
            </span>
          </Link>
          <Link
            href="/team"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              groups
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Team
            </span>
          </Link>
          <Link
            href="/leaderboard"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              leaderboard
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Leaderboard
            </span>
          </Link>
          <Link
            href="/vault"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              lock_open
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Vault
            </span>
          </Link>
          <Link
            href="/logs"
            className="flex flex-col items-center gap-2 p-4 brass-plate rounded-lg hover:bg-surface-container-highest transition-all group"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-2xl group-hover:text-primary transition-colors">
              history_edu
            </span>
            <span className="font-label text-label-sm text-on-surface-variant font-bold uppercase group-hover:text-primary transition-colors">
              Logs
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}