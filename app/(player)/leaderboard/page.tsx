"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useTimer } from "@/hooks/use-timer";
import { LeaderboardSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import type { ActiveGameView, PlayerMeView } from "@/lib/types/api-responses";

export default function LeaderboardPage() {
  const [game, setGame] = useState<ActiveGameView | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const teamRowRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const [gameRes, playerRes] = await Promise.all([
          apiFetch<{ success: boolean; data: ActiveGameView | null }>("/api/v1/games/active"),
          apiFetch<{ success: boolean; data: PlayerMeView }>("/api/v1/players/me"),
        ]);
        if (gameRes.success && gameRes.data) setGame(gameRes.data);
        if (playerRes.success) setMyTeamId(playerRes.data.team?.id ?? null);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { connected: lbConnected, reconnecting: lbReconnecting, teams } = useLeaderboard({
    gameId: game?.id ?? "",
    enabled: !!game?.id,
  });

  const { timer, reconnecting: timerReconnecting } = useTimer({
    gameId: game?.id ?? "",
    enabled: !!game?.id,
  });

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (!hasScrolledRef.current && myTeamId && teams.length > 0) {
      const idx = teams.findIndex((t) => t.team_id === myTeamId);
      if (idx >= 0 && teamRowRef.current) {
        teamRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        hasScrolledRef.current = true;
      }
    }
  }, [teams, myTeamId]);

  const showSkeleton = loading || (game && teams.length === 0 && !lbConnected);
  const isReconnecting = lbReconnecting || timerReconnecting;

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-1 mt-2">
        <h1 className="font-headline text-headline-lg-mobile text-on-surface etched-text">
          Live Leaderboard
        </h1>
        <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
          {game
            ? `Round ${game.current_round} — ${game.title}`
            : "No active game"}
        </p>
      </div>

      <div className="glass-panel rounded-xl p-4 flex items-center justify-center gap-3">
        <span className="material-symbols-outlined text-error text-xl">
          timer
        </span>
        <span className="font-label text-label-sm text-error uppercase">
          Time Remaining
        </span>
        <span className="font-headline text-3xl text-error font-bold tracking-widest">
          {timer ? formatTime(timer.remaining) : "--:--"}
        </span>
        <span className="flex items-center gap-1.5">
          {lbConnected && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
          {isReconnecting && (
            <span className="font-label text-label-sm text-on-surface-variant animate-pulse">
              Reconnecting...
            </span>
          )}
        </span>
      </div>

      {showSkeleton ? (
        <LeaderboardSkeleton />
      ) : teams.length === 0 ? (
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">
            leaderboard
          </span>
          <p className="font-body text-body-md text-on-surface-variant">
            {game ? "Waiting for teams to scan..." : "No active game"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((entry) => {
            const isMyTeam = entry.team_id === myTeamId;
            return (
              <div
                key={entry.team_id}
                ref={isMyTeam ? teamRowRef : undefined}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                  entry.eliminated
                    ? "bg-surface-container-low border-outline-variant/20 opacity-50"
                    : isMyTeam
                      ? "bg-surface-container border-primary/50 shadow-[0_0_10px_rgba(217,119,7,0.15)]"
                      : "bg-surface-container border-outline-variant/30"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-headline text-lg font-bold ${
                    (entry.rank ?? 0) <= 3
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {entry.rank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-headline text-sm ${
                        entry.eliminated
                          ? "text-on-surface-variant line-through"
                          : isMyTeam
                            ? "text-primary font-bold"
                            : "text-on-surface"
                      }`}
                    >
                      {entry.name}
                    </p>
                    {isMyTeam && (
                      <span className="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary font-label text-[10px] uppercase tracking-wider">
                        You
                      </span>
                    )}
                  </div>
                  <p className="font-label text-label-sm text-on-surface-variant">
                    {entry.eliminated ? "Eliminated" : "Active"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-headline text-lg text-primary font-bold">
                    {entry.score}
                  </p>
                  <p className="font-label text-label-sm text-on-surface-variant">
                    pts
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {teams.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-error/50 border-t border-dashed border-error" />
          <span className="font-label text-label-sm text-error uppercase">
            Elimination Line
          </span>
          <div className="flex-1 h-px bg-error/50 border-t border-dashed border-error" />
        </div>
      )}
    </div>
  );
}
