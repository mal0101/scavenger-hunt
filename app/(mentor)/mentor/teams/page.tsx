"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface TeamEntry {
  id: string;
  name: string;
  invite_code: string;
  game_id: string;
  game_title: string;
  total_score: number;
  eliminated: boolean;
  member_count: number;
}

interface MiniGame {
  id: string;
  title: string;
  elimination_pct: number;
}

const REFRESH_MS = 10000;

export default function MentorTeamsPage() {
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [games, setGames] = useState<MiniGame[]>([]);
  const [selectedGame, setSelectedGame] = useState("all");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const url = selectedGame !== "all"
          ? `/api/v1/admin/teams?game_id=${selectedGame}`
          : "/api/v1/admin/teams";
        const j = await apiFetch<{ success: boolean; data: TeamEntry[] }>(url);
        if (active && j.success) setTeams(j.data);
      } catch {
        // keep last good data
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [selectedGame]);

  const rankedTeams = teams.map((t, i) => ({ ...t, rank: i + 1 }));
  const activeCount = rankedTeams.filter((t) => !t.eliminated).length;
  const eliminatedCount = rankedTeams.filter((t) => t.eliminated).length;
  const totalPlayers = rankedTeams.reduce((sum, t) => sum + t.member_count, 0);

  const selectedPct =
    selectedGame !== "all"
      ? games.find((g) => g.id === selectedGame)?.elimination_pct ?? 0.2
      : null;
  const cutCount = selectedPct && rankedTeams.length > 0
    ? Math.max(1, Math.floor(rankedTeams.length * selectedPct))
    : null;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="font-headline text-headline-xl text-on-surface">
          Team Telemetry
        </h1>
        <p className="font-body text-body-md text-on-surface-variant">
          Monitor all teams and their progress in real-time (auto-refreshes every {REFRESH_MS / 1000}s)
        </p>
      </div>

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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Total Teams</p>
          <p className="font-headline text-2xl text-on-surface font-bold">{loading ? "--" : rankedTeams.length}</p>
        </div>
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Active</p>
          <p className="font-headline text-2xl text-primary font-bold">{loading ? "--" : activeCount}</p>
        </div>
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Eliminated</p>
          <p className="font-headline text-2xl text-error font-bold">{loading ? "--" : eliminatedCount}</p>
        </div>
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Total Players</p>
          <p className="font-headline text-2xl text-on-surface font-bold">{loading ? "--" : totalPlayers}</p>
        </div>
      </div>

      {cutCount !== null && rankedTeams.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-error/50 border-t border-dashed border-error" />
          <span className="font-label text-label-sm text-error uppercase">
            Elimination Line (Bottom {Math.round(selectedPct! * 100)}% · {cutCount} team{cutCount > 1 ? "s" : ""})
          </span>
          <div className="flex-1 h-px bg-error/50 border-t border-dashed border-error" />
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <p className="font-body text-body-md text-on-surface-variant animate-pulse">Loading teams...</p>
          </div>
        ) : rankedTeams.length === 0 ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">group</span>
            <p className="font-body text-body-md text-on-surface-variant">No teams {selectedGame !== "all" ? "for this game" : "yet"}</p>
          </div>
        ) : (
          rankedTeams.map((team) => (
            <div
              key={team.id}
              className={`bg-surface-container rounded-xl border p-5 transition-all ${
                team.eliminated
                  ? "border-outline-variant/20 opacity-60"
                  : "border-outline-variant/30 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-headline text-lg font-bold ${
                    team.rank <= 3
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {team.rank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-headline text-sm ${
                        team.eliminated ? "text-on-surface-variant line-through" : "text-on-surface"
                      }`}
                    >
                      {team.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full font-label text-label-sm font-bold uppercase ${
                        team.eliminated
                          ? "bg-error-container/10 text-error"
                          : "bg-primary-container/10 text-primary"
                      }`}
                    >
                      {team.eliminated ? "ELIMINATED" : "ACTIVE"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="font-label text-label-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">group</span>
                      {team.member_count}
                    </span>
                    <span className="font-label text-label-sm text-on-surface-variant">
                      Code: {team.invite_code}
                    </span>
                    <span className="font-label text-label-sm text-on-surface-variant">
                      Game: {team.game_title}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-headline text-xl text-primary font-bold">{team.total_score}</p>
                  <p className="font-label text-label-sm text-on-surface-variant">pts</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
