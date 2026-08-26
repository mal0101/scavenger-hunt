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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch("/api/v1/admin/games")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setGames(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/v1/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const j = await res.json();
      if (j.success) {
        setGames((prev) => [{ ...j.data, team_count: 0, round_count: 0, current_round: 0, created_at: new Date().toISOString() }, ...prev]);
        setShowCreate(false);
        setTitle("");
        setDescription("");
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
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
          className="px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all flex items-center gap-2"
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
          <button
            type="submit"
            disabled={creating || !title}
            className="px-6 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all disabled:opacity-50"
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
            <Link key={game.id} href={`/mentor/games/${game.id}`} className="block">
              <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-5 hover:border-primary/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-headline text-lg text-on-surface">
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
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
