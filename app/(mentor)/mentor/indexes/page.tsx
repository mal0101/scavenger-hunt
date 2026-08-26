"use client";

import { useEffect, useState } from "react";

interface IndexEntry {
  id: string;
  game_id: string;
  game_title: string;
  label: string;
  points: number;
  location_name: string | null;
  enigma_type: string | null;
  scan_count: number;
}

export default function MentorIndexesPage() {
  const [indexes, setIndexes] = useState<IndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    game_id: "",
    label: "",
    description: "",
    points: 25,
    location_name: "",
    enigma_type: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = selectedGame !== "all"
          ? `/api/v1/admin/indexes?game_id=${selectedGame}`
          : "/api/v1/admin/indexes";
        const res = await fetch(url);
        const j = await res.json();
        if (j.success) setIndexes(j.data);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedGame, refreshKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/v1/admin/indexes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          points: Number(form.points),
          location_name: form.location_name || undefined,
          enigma_type: form.enigma_type || undefined,
          description: form.description || undefined,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setShowCreate(false);
        setForm({ game_id: "", label: "", description: "", points: 25, location_name: "", enigma_type: "" });
        setRefreshKey((k) => k + 1);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  const uniqueGames = Array.from(new Map(indexes.map((i) => [i.game_id, i.game_title])).entries());

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-headline-xl text-on-surface">
            Index Management
          </h1>
          <p className="font-body text-body-md text-on-surface-variant">
            Generate and manage QR checkpoint markers
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">
            {showCreate ? "close" : "add"}
          </span>
          {showCreate ? "Cancel" : "New Index"}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-surface-container rounded-xl border border-primary/30 p-6 space-y-4"
        >
          <h3 className="font-headline text-lg text-on-surface">Create New Index</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">Game ID</label>
              <input
                type="text"
                value={form.game_id}
                onChange={(e) => setForm({ ...form, game_id: e.target.value })}
                required
                placeholder="UUID of game"
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
                placeholder="Smiling Rock"
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">Points</label>
              <input
                type="number"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                min={1}
                max={100}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">Location</label>
              <input
                type="text"
                value={form.location_name}
                onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                placeholder="Main Building"
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">Type</label>
              <select
                value={form.enigma_type}
                onChange={(e) => setForm({ ...form, enigma_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">None</option>
                <option value="enigma">Enigma</option>
                <option value="trap">Trap</option>
                <option value="puzzle">Puzzle</option>
                <option value="trivia">Trivia</option>
                <option value="visual">Visual</option>
                <option value="physical">Physical</option>
                <option value="logic">Logic</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !form.game_id || !form.label}
            className="px-6 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Index"}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3">
        <span className="font-label text-label-sm text-on-surface-variant">Filter by game:</span>
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="all">All Games</option>
          {uniqueGames.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <p className="font-body text-body-md text-on-surface-variant animate-pulse">Loading indexes...</p>
          </div>
        ) : indexes.length === 0 ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">qr_code</span>
            <p className="font-body text-body-md text-on-surface-variant">No indexes found</p>
          </div>
        ) : (
          indexes.map((index) => (
            <div
              key={index.id}
              className="bg-surface-container rounded-xl border border-outline-variant/30 p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-container/20 border border-primary/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">qr_code</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-headline text-sm text-on-surface">{index.label}</p>
                  {index.enigma_type && (
                    <span className={`px-2 py-0.5 rounded font-label text-label-sm font-bold uppercase ${
                      index.enigma_type === "trap"
                        ? "bg-error-container/10 text-error"
                        : "bg-primary-container/10 text-primary"
                    }`}>
                      {index.enigma_type}
                    </span>
                  )}
                </div>
                <p className="font-label text-label-sm text-on-surface-variant">
                  {index.game_title} · {index.location_name ?? "No location"} · {index.points} pts · {index.scan_count} scans
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
