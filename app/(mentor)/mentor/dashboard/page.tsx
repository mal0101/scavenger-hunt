"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Game {
  id: string;
  title: string;
  status: string;
  current_round: number;
  team_count: number;
  round_count: number;
  created_at: string;
}

export default function MentorDashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/games")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setGames(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeGame = games.find((g) => g.status === "ACTIVE");
  const totalTeams = games.reduce((sum, g) => sum + g.team_count, 0);
  const activeGameCount = games.filter((g) => g.status === "ACTIVE").length;
  const finishedGameCount = games.filter((g) => g.status === "FINISHED").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="font-headline text-headline-xl text-on-surface">
          Command Center
        </h1>
        <p className="font-body text-body-md text-on-surface-variant">
          Real-time overview of all active hunts
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">
              sports_esports
            </span>
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Total Games
            </span>
          </div>
          <p className="font-headline text-3xl text-on-surface font-bold">
            {loading ? "--" : games.length}
          </p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">
              play_circle
            </span>
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Active
            </span>
          </div>
          <p className="font-headline text-3xl text-primary font-bold">
            {loading ? "--" : activeGameCount}
          </p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">
              groups
            </span>
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              Total Teams
            </span>
          </div>
          <p className="font-headline text-3xl text-on-surface font-bold">
            {loading ? "--" : totalTeams}
          </p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">
              check_circle
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

      {activeGame ? (
        <Link
          href={`/mentor/games/${activeGame.id}`}
          className="block"
        >
          <div className="bg-surface-container rounded-xl border border-primary/30 p-6 space-y-4 hover:border-primary/60 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">
                  sports_esports
                </span>
                <div>
                  <h2 className="font-headline text-lg text-on-surface">
                    {activeGame.title}
                  </h2>
                  <p className="font-label text-label-sm text-on-surface-variant uppercase">
                    Round {activeGame.current_round} — In Progress
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-primary-container/20 border border-primary/50 rounded-full flex items-center gap-1.5 animate-pulse-border">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="font-label text-label-sm text-primary">LIVE</span>
                </span>
              </div>
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
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">
            sports_esports
          </span>
          <p className="font-body text-body-md text-on-surface-variant">
            {loading ? "Loading games..." : "No active game"}
          </p>
          <Link
            href="/mentor/games"
            className="inline-block mt-3 font-label text-label-sm text-primary hover:underline"
          >
            Go to Game Management
          </Link>
        </div>
      )}

      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
          All Games
        </h3>
        {loading ? (
          <p className="text-on-surface-variant font-body animate-pulse">Loading...</p>
        ) : games.length === 0 ? (
          <p className="text-on-surface-variant font-body">No games yet</p>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/mentor/games/${game.id}`}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      game.status === "ACTIVE"
                        ? "bg-primary animate-pulse"
                        : game.status === "FINISHED"
                          ? "bg-on-surface-variant"
                          : "bg-outline-variant"
                    }`}
                  />
                  <div>
                    <p className="font-headline text-sm text-on-surface">{game.title}</p>
                    <p className="font-label text-label-sm text-on-surface-variant">
                      {game.team_count} teams · Round {game.current_round}
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
  );
}
