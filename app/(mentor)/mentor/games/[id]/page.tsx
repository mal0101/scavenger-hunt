"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface GameDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  max_rounds: number;
  round_duration: number;
  elimination_pct: number;
  team_count: number;
  current_round?: number;
  rounds: Array<{
    id: string;
    round_number: number;
    status: string;
    started_at: string | null;
  }>;
  indexes: Array<{
    id: string;
    label: string;
    description: string | null;
    points: number;
    location_name: string | null;
    enigma_type: string | null;
  }>;
}

export default function MentorGameDetailPage() {
  const params = useParams();
  const gameId = params.id as string;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/admin/games/${gameId}`);
        const j = await res.json();
        if (j.success) setGame(j.data);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gameId]);

  async function handleState(action: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/games/${gameId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (j.success) {
        const refresh = await fetch(`/api/v1/admin/games/${gameId}`);
        const rj = await refresh.json();
        if (rj.success) setGame(rj.data);
      }
    } catch {
      // keep defaults
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="font-body text-on-surface-variant animate-pulse">Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="font-body text-on-surface-variant">Game not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/mentor/games"
          className="text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="font-headline text-headline-xl text-on-surface">
            {game.title}
          </h1>
          {game.description && (
            <p className="font-body text-body-md text-on-surface-variant">
              {game.description}
            </p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full font-label text-label-sm text-primary font-bold ${
            game.status === "ACTIVE"
              ? "bg-primary-container/20 border border-primary/50"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {game.status}
        </span>
      </div>

      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
          State Controls
        </h3>
        <div className="flex flex-wrap gap-3">
          {game.status === "PENDING" && (
            <button
              onClick={() => handleState("start")}
              disabled={actionLoading}
              className="px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              Start Game
            </button>
          )}
          {game.status === "ELIMINATING" && (
            <>
              <button
                onClick={() => handleState("next_round")}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                Start Next Round
              </button>
              <button
                onClick={() => handleState("finish")}
                disabled={actionLoading}
                className="px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface-variant font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-highest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">flag</span>
                Declare Winner
              </button>
            </>
          )}
          {game.status === "ACTIVE" && (
            <>
              <button
                onClick={() => handleState("eliminate")}
                disabled={actionLoading}
                className="px-4 py-2 bg-error-container/20 border border-error/30 text-error font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-error/10 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">skip_next</span>
                Eliminate Bottom {Math.round(game.elimination_pct * 100)}%
              </button>
              <button
                onClick={() => handleState("finish")}
                disabled={actionLoading}
                className="px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface-variant font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-highest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">stop</span>
                Finish Game
              </button>
            </>
          )}
          {game.status === "FINISHED" && (
            <button
              onClick={() => handleState("reset")}
              disabled={actionLoading}
              className="px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface-variant font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-highest transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">replay</span>
              Reset Game
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
          Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Max Rounds
            </p>
            <p className="font-headline text-xl text-on-surface">{game.max_rounds}</p>
          </div>
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Round Duration
            </p>
            <p className="font-headline text-xl text-on-surface">
              {Math.floor(game.round_duration / 60)}min
            </p>
          </div>
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
            <p className="font-label text-label-sm text-on-surface-variant uppercase">
              Elimination %
            </p>
            <p className="font-headline text-xl text-error">
              {Math.round(game.elimination_pct * 100)}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
          Rounds ({game.rounds.length})
        </h3>
        {game.rounds.length === 0 ? (
          <p className="text-on-surface-variant font-body">No rounds yet</p>
        ) : (
          <div className="space-y-2">
            {game.rounds.map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/20"
              >
                <div className="flex items-center gap-3">
                  <span className="font-headline text-lg text-on-surface">
                    Round {round.round_number}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-label text-label-sm font-bold uppercase ${
                      round.status === "ACTIVE"
                        ? "bg-primary-container/20 text-primary border border-primary/30"
                        : round.status === "COMPLETED"
                          ? "bg-surface-container text-on-surface-variant"
                          : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {round.status}
                  </span>
                </div>
                {round.started_at && (
                  <span className="font-label text-label-sm text-on-surface-variant">
                    Started: {new Date(round.started_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <h3 className="font-headline text-lg text-on-surface">
            QR Indexes ({game.indexes.length})
          </h3>
          <Link
            href="/mentor/indexes"
            className="text-primary font-label text-label-sm hover:underline"
          >
            Manage All
          </Link>
        </div>
        {game.indexes.length === 0 ? (
          <p className="text-on-surface-variant font-body">No indexes created yet</p>
        ) : (
          <div className="space-y-2">
            {game.indexes.map((index) => (
              <div
                key={index.id}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/20"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div>
                    <p className="font-headline text-sm text-on-surface">{index.label}</p>
                    <p className="font-label text-label-sm text-on-surface-variant">
                      {index.location_name ?? "No location"} · {index.points} pts
                    </p>
                  </div>
                </div>
                {index.enigma_type && (
                  <span
                    className={`px-2 py-0.5 rounded font-label text-label-sm font-bold uppercase ${
                      index.enigma_type === "trap"
                        ? "bg-error-container/10 text-error"
                        : "bg-primary-container/10 text-primary"
                    }`}
                  >
                    {index.enigma_type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
