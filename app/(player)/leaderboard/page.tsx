"use client";

import { useEffect, useState, useCallback } from "react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useTimer } from "@/hooks/use-timer";
import { LeaderboardSkeleton } from "@/components/ui/skeleton";

interface GameData {
  id: string;
  title: string;
  current_round: number;
}

export default function LeaderboardPage() {
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/games/active")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setGame(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { connected: lbConnected, teams } = useLeaderboard({
    gameId: game?.id ?? "",
    enabled: !!game?.id,
  });

  const { timer } = useTimer({
    gameId: game?.id ?? "",
    enabled: !!game?.id,
  });

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, []);

  const displayTeams = teams.length > 0 ? teams : [];
  const showSkeleton = loading || (game && teams.length === 0 && !lbConnected);

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-1 mt-2">
        <h1 className="font-headline text-headline-lg-mobile text-on-surface">
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
        {lbConnected && (
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>

      {showSkeleton ? (
        <LeaderboardSkeleton />
      ) : displayTeams.length === 0 ? (
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
          {displayTeams.map((entry) => (
            <div
              key={entry.team_id}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                entry.eliminated
                  ? "bg-surface-container-low border-outline-variant/20 opacity-50"
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
                <p
                  className={`font-headline text-sm ${
                    entry.eliminated
                      ? "text-on-surface-variant line-through"
                      : "text-on-surface"
                  }`}
                >
                  {entry.name}
                </p>
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
          ))}
        </div>
      )}

      {displayTeams.length > 0 && (
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
