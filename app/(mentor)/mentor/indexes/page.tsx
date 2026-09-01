"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

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

interface MiniGame {
  id: string;
  title: string;
}

export default function MentorIndexesPage() {
  const [indexes, setIndexes] = useState<IndexEntry[]>([]);
  const [games, setGames] = useState<MiniGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [qrResult, setQrResult] = useState<Array<{ index_id?: string; label: string; format?: string; svg?: string; data_url?: string }>>([]);
  const [activeQr, setActiveQr] = useState<IndexEntry | null>(null);
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
        const j = await apiFetch<{ success: boolean; data: IndexEntry[] }>(url);
        if (j.success) setIndexes(j.data);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedGame, refreshKey]);

  useEffect(() => {
    async function loadGames() {
      try {
        const j = await apiFetch<{ success: boolean; data: MiniGame[] }>("/api/v1/admin/games");
        if (j.success) setGames(j.data);
      } catch {
        // keep defaults
      }
    }
    loadGames();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      const j = await apiFetch<{ success: boolean; message?: string }>("/api/v1/admin/indexes", {
        method: "POST",
        body: {
          ...form,
          points: Number(form.points),
          location_name: form.location_name || undefined,
          enigma_type: form.enigma_type || undefined,
          description: form.description || undefined,
        },
      });
      if (j.success) {
        setShowCreate(false);
        setForm({ game_id: "", label: "", description: "", points: 25, location_name: "", enigma_type: "" });
        setRefreshKey((k) => k + 1);
      } else {
        setFormError(j.message || "Failed to create index");
      }
    } catch {
      setFormError("Network error creating index");
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateQr() {
    if (selectedGame === "all") return;
    setQrBusy(true);
    setQrResult([]);
    try {
      const j = await apiFetch<{
        success: boolean;
        data: { codes?: Array<{ index_id: string; label: string; format: string; data_url?: string; svg?: string }> };
      }>("/api/v1/admin/indexes/generate", {
        method: "POST",
        body: { game_id: selectedGame },
      });
      setQrResult(j.data?.codes ?? []);
    } catch {
      setQrResult([]);
    } finally {
      setQrBusy(false);
    }
  }

  async function handleOpenQr(index: IndexEntry) {
    setActiveQr(index);
  }

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
          className="px-4 py-2 btn-shimmer bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all flex items-center gap-2"
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
              <label className="font-label text-label-sm text-on-surface-variant uppercase block mb-2">Game</label>
              <select
                value={form.game_id}
                onChange={(e) => setForm({ ...form, game_id: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">Select a game</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
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
          {formError && (
            <div className="bg-error-container/20 border border-error/40 rounded-lg p-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="font-label text-label-sm text-error">{formError}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={creating || !form.game_id || !form.label}
            className="px-6 py-2 btn-shimmer bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Index"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-label text-label-sm text-on-surface-variant">Filter by game:</span>
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="all">All Games</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
        <button
          onClick={handleGenerateQr}
          disabled={selectedGame === "all" || qrBusy}
          title={selectedGame === "all" ? "Select a specific game to generate QR codes" : "Generate a printable QR code per index for this game"}
          className="px-4 py-1.5 btn-shimmer bg-primary-container/20 border border-primary/40 text-primary font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-primary-container/30 transition-all flex items-center gap-2 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-lg">qr_code_2</span>
          {qrBusy ? "Generating..." : "Generate QR Codes"}
        </button>
      </div>

      {qrResult.length > 0 && (
        <div className="bg-surface-container rounded-xl border border-primary/30 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-lg text-on-surface">
              Generated QR Codes ({qrResult.length})
            </h3>
            <button
              onClick={() => setQrResult([])}
              className="p-1 rounded text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {qrResult.map((code) => (
              <div
                key={code.index_id}
                className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 flex flex-col items-center gap-2"
              >
                {code.format === "png" && code.data_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={code.data_url} alt={code.label} className="w-28 h-28" />
                ) : code.svg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(code.svg)}`}
                    alt={`QR code for ${code.label}`}
                    role="img"
                    className="w-28 h-28"
                  />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">qr_code</span>
                )}
                <p className="font-label text-label-sm text-on-surface text-center">{code.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeQr && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setActiveQr(null)}>
          <div
            className="bg-surface-container rounded-2xl border border-primary/40 p-8 max-w-sm w-full space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveQr(null)}
              className="absolute top-3 right-3 p-1 rounded text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <p className="font-headline text-xl text-on-surface">{activeQr.label}</p>
            <div className="aspect-square bg-white rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-6xl">qr_code</span>
            </div>
            <p className="font-label text-label-sm text-on-surface-variant text-center">
              Use the &ldquo;Generate QR Codes&rdquo; action above to produce a real scannable code for this game.
            </p>
          </div>
        </div>
      )}

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
              <button
                onClick={() => handleOpenQr(index)}
                title="View QR info"
                className="p-2 rounded-lg text-primary border border-primary/30 hover:bg-primary-container/20 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">qr_code</span>
                <span className="font-label text-label-sm">QR</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
