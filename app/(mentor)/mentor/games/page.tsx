"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { GAME_CONSTANTS } from "@/lib/utils/constants";

interface Game {
  id: string;
  title: string;
  description: string | null;
  status: string;
  max_rounds: number;
  round_duration: number;
  elimination_pct: number;
  current_round: number;
  team_count: number;
  round_count: number;
  created_at: string;
}

const STATE_COLORS: Record<string, string> = {
  PENDING: "bg-surface-container-high text-on-surface-variant",
  ACTIVE: "bg-primary-container/20 text-primary border border-primary/30",
  ELIMINATING: "bg-error-container/20 text-error border border-error/30",
  FINISHED: "bg-surface-container text-on-surface-variant",
};

export default function MentorGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxRounds, setMaxRounds] = useState<number>(GAME_CONSTANTS.DEFAULT_MAX_ROUNDS);
  const [roundDuration, setRoundDuration] = useState<number>(GAME_CONSTANTS.DEFAULT_ROUND_DURATION);
  const [eliminationPct, setEliminationPct] = useState<number>(GAME_CONSTANTS.DEFAULT_ELIMINATION_PCT);

  useEffect(() => {
    async function load() {
      try {
        const j = await apiFetch<{ success: boolean; data: Game[] }>("/api/v1/admin/games");
        if (j.success) setGames(j.data);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      const j = await apiFetch<{ success: boolean; data?: Game; message?: string }>(
        "/api/v1/admin/games",
        {
          method: "POST",
          body: {
            title,
            description,
            max_rounds: maxRounds,
            round_duration: roundDuration,
            elimination_pct: eliminationPct,
          },
        }
      );
      if (j.success) {
        const created = j.data!;
        setGames((prev) => [
          {
            ...created,
            description: description || null,
            max_rounds: maxRounds,
            round_duration: roundDuration,
            elimination_pct: eliminationPct,
            team_count: 0,
            round_count: 0,
            current_round: 0,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setShowCreate(false);
        setTitle("");
        setDescription("");
      } else {
        setFormError(j.message || "Failed to create game");
      }
    } catch {
      setFormError("Network error creating game");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this game? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/v1/admin/games/${id}`, { method: "DELETE" });
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch {
      // keep row on failure
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-headline-xl text-on-surface">
            Game Management
          </h1>
          <p className="font-body text-body-md text-on-surface-variant">
            Create and manage scavenger hunts
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 btn-shimmer bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">
            {showCreate ? "close" : "add"}
          </span>
          {showCreate ? "Cancel" : "New Game"}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-surface-container rounded-xl border border-primary/30 p-6 space-y-4"
        >
          <h3 className="font-headline text-lg text-on-surface">Create New Game</h3>
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Tidal Caves Expedition"
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="A steampunk scavenger hunt across the ENSAM campus"
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
                Max Rounds
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxRounds}
                onChange={(e) => setMaxRounds(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
                Round Duration (s)
              </label>
              <input
                type="number"
                min={300}
                max={7200}
                step={60}
                value={roundDuration}
                onChange={(e) => setRoundDuration(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">
                Eliminate Bottom %
              </label>
              <input
                type="number"
                min={0}
                max={50}
                step={5}
                value={Math.round(eliminationPct * 100)}
                onChange={(e) => setEliminationPct(Number(e.target.value) / 100)}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          {formError && (
            <div className="bg-error-container/20 border border-error/40 rounded-lg p-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="font-label text-label-sm text-error">{formError}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={creating || !title}
            className="px-6 py-2 btn-shimmer bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Game"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <p className="font-body text-body-md text-on-surface-variant animate-pulse">
              Loading games...
            </p>
          </div>
        ) : games.length === 0 ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">
              sports_esports
            </span>
            <p className="font-body text-body-md text-on-surface-variant">
              No games yet. Create your first scavenger hunt!
            </p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <Link href={`/mentor/games/${game.id}`} className="flex-1 min-w-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-headline text-lg text-on-surface truncate">
                        {game.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full font-label text-label-sm font-bold uppercase ${
                          STATE_COLORS[game.status] || ""
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-on-surface-variant">
                      <span className="font-label text-label-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          groups
                        </span>
                        {game.team_count} teams
                      </span>
                      <span className="font-label text-label-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          flag
                        </span>
                        Round {game.current_round}
                      </span>
                      <span className="font-label text-label-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          straighten
                        </span>
                        {Math.round(game.elimination_pct * 100)}% cut / round
                      </span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(game.id)}
                  disabled={deleting === game.id}
                  title="Delete game"
                  className="p-2 rounded-lg text-on-surface-variant hover:text-error border border-transparent hover:border-error/30 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">
                    {deleting === game.id ? "hourglass_empty" : "delete"}
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
