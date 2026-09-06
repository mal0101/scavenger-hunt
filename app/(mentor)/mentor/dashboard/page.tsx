"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

interface Game {
  id: string;
  title: string;
  status: string;
  current_round: number;
  team_count: number;
  round_count: number;
  created_at: string;
}

interface GameTeam {
  id: string;
  name: string;
  total_score: number;
  eliminated: boolean;
  member_count: number;
  rank: number;
}

interface GameDetail {
  id: string;
  title: string;
  status: string;
  current_round?: number;
  team_count: number;
  teams: GameTeam[];
}

export default function MentorDashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [activeDetail, setActiveDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await apiFetch<{ success: boolean; data: Game[] }>("/api/v1/admin/games");
        if (!mounted) return;
        if (res.success) {
          setGames(res.data);
          const theActive = res.data.find((g) => g.status === "ACTIVE");
          if (theActive) {
            const detail = await apiFetch<{ success: boolean; data: GameDetail }>(
              `/api/v1/admin/games/${theActive.id}`
            );
            if (mounted && detail.success) setActiveDetail(detail.data);
          } else {
            setActiveDetail(null);
          }
          setLastSync(new Date());
        }
      } catch {
        // keep previous state
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeGame = games.find((g) => g.status === "ACTIVE");
  const totalTeams = games.reduce((sum, g) => sum + g.team_count, 0);
  const activeGameCount = games.filter((g) => g.status === "ACTIVE").length;
  const finishedGameCount = games.filter((g) => g.status === "FINISHED").length;
  const pendingGameCount = games.filter((g) => g.status === "PENDING").length;

  const snapshotTeams = (activeDetail?.teams ?? []).slice(0, 5);
  const topTeam = snapshotTeams[0];

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-primary animate-pulse",
    PENDING: "bg-outline",
    ELIMINATING: "bg-secondary",
    FINISHED: "bg-on-surface-variant",
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-headline-xl text-on-surface etched-text">
            Command Center
          </h1>
          <p className="font-body text-body-md text-on-surface-variant">
            Amber Mariner — real-time fleet overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-label text-label-sm uppercase">
            {lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : "LIVE"}
          </span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="brass-plate rounded-xl p-4 wood-grain">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg animate-flicker-amber">
              sports_esports
            </span>
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Total Games
            </span>
          </div>
          <p className="font-headline text-3xl text-on-surface font-bold etched-text">
            {loading ? "--" : games.length}
          </p>
        </div>
        <div className="brass-plate rounded-xl p-4 wood-grain">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">
              play_circle
            </span>
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Active
            </span>
          </div>
          <p className="font-headline text-3xl text-primary font-bold etched-text">
            {loading ? "--" : activeGameCount}
          </p>
        </div>
        <div className="brass-plate rounded-xl p-4 wood-grain">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">
              groups
            </span>
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Total Teams
            </span>
          </div>
          <p className="font-headline text-3xl text-on-surface font-bold etched-text">
            {loading ? "--" : totalTeams}
          </p>
        </div>
        <div className="brass-plate rounded-xl p-4 wood-grain">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">
              flag
            </span>
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Finished
            </span>
          </div>
          <p className="font-headline text-3xl text-on-surface-variant font-bold">
            {loading ? "--" : finishedGameCount}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active game hero + live leaderboard */}
        <div className="space-y-6">
          {activeDetail && topTeam ? (
            <div className="glass-panel rounded-xl p-6 space-y-4 relative overflow-hidden ambient-glow">
              <div className="absolute top-3 right-5 opacity-30 animate-gear-slow pointer-events-none">
                <span className="material-symbols-outlined text-primary text-5xl">settings</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline text-lg text-on-surface">{activeDetail.title}</h2>
                  <p className="font-label text-label-sm text-on-surface-variant uppercase">
                    Round {activeGame?.current_round ?? "—"} — Live Leaderboard
                  </p>
                </div>
                <span className="px-3 py-1 bg-primary-container/20 border border-primary/50 rounded-full flex items-center gap-1.5 animate-pulse-border">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="font-label text-label-sm text-primary">LIVE</span>
                </span>
              </div>

              <div className="space-y-2">
                {snapshotTeams.map((t) => (
                  <Link
                    key={t.id}
                    href={`/mentor/games/${activeDetail.id}`}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                      t.eliminated
                        ? "opacity-50 bg-surface-container-low border-outline-variant/20"
                        : "bg-surface-container border-outline-variant/30 hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-headline text-sm font-bold ${
                        t.rank <= 3
                          ? "bg-primary-container text-on-primary-container shadow-[0_0_10px_rgba(217,119,7,0.4)]"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {t.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-headline text-sm truncate ${t.eliminated ? "text-on-surface-variant line-through" : "text-on-surface"}`}>
                        {t.name}
                      </p>
                      <p className="font-label text-label-sm text-on-surface-variant">
                        {t.member_count} members
                      </p>
                    </div>
                    <span className="font-headline text-lg text-primary font-bold etched-text">
                      {t.total_score}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href={`/mentor/games/${activeDetail.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all"
                >
                  Manage Hunt
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </div>
            </div>
          ) : activeGame ? (
            <Link href={`/mentor/games/${activeGame.id}`} className="block">
              <div className="glass-panel rounded-xl p-6 space-y-4 ambient-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-headline text-lg text-on-surface">{activeGame.title}</h2>
                    <p className="font-label text-label-sm text-on-surface-variant uppercase">
                      Round {activeGame.current_round} — In Progress
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-primary-container/20 border border-primary/50 rounded-full flex items-center gap-1.5 animate-pulse-border">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="font-label text-label-sm text-primary">LIVE</span>
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="font-label text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">groups</span>
                    {activeGame.team_count} teams
                  </span>
                  <span className="font-label text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">flag</span>
                    {activeGame.round_count} rounds
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="glass-panel rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block animate-flicker-amber">
                sports_esports
              </span>
              <p className="font-body text-body-md text-on-surface-variant">
                {loading ? "Loading games..." : "No hunt is currently active"}
              </p>
              <Link
                href="/mentor/games"
                className="inline-block mt-3 font-label text-label-sm text-primary hover:underline"
              >
                Go to Game Management
              </Link>
            </div>
          )}

          {/* Status breakdown */}
          <div className="brass-plate rounded-xl p-4 wood-grain">
            <h3 className="font-label text-label-sm uppercase text-on-surface-variant mb-3 tracking-widest">
              Fleet Status
            </h3>
            <div className="space-y-2">
              {[
                { label: "Active", count: activeGameCount, dot: "bg-primary animate-pulse" },
                { label: "Pending", count: pendingGameCount, dot: "bg-outline" },
                { label: "Finished", count: finishedGameCount, dot: "bg-on-surface-variant" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                  <span className="font-body text-body-md text-on-surface-variant flex-1">
                    {row.label}
                  </span>
                  <span className="font-headline text-lg text-on-surface font-bold">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All games list */}
        <div className="glass-panel rounded-xl p-6 space-y-4 wood-grain">
          <h3 className="font-headline text-lg text-on-surface pb-3 border-b border-outline-variant/30">
            All Hunts
          </h3>
          {loading ? (
            <p className="text-on-surface-variant font-body animate-pulse">Loading...</p>
          ) : games.length === 0 ? (
            <p className="text-on-surface-variant font-body">No hunts yet</p>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <Link
                  key={game.id}
                  href={`/mentor/games/${game.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border transition-all group brass-plate hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${statusColor[game.status] ?? "bg-outline-variant"}`} />
                    <div>
                      <p className="font-headline text-sm text-on-surface group-hover:text-primary transition-colors">
                        {game.title}
                      </p>
                      <p className="font-label text-label-sm text-on-surface-variant">
                        {game.team_count} teams · Round {game.current_round}/{game.round_count}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-label text-label-sm font-bold uppercase ${
                      game.status === "ACTIVE"
                        ? "bg-primary-container/20 text-primary border border-primary/30"
                        : game.status === "FINISHED"
                          ? "bg-surface-container text-on-surface-variant"
                          : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {game.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
