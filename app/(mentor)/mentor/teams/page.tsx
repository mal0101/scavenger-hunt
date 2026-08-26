"use client";

import { useEffect, useState } from "react";

interface TeamEntry {
  rank: number;
  id: string;
  name: string;
  invite_code: string;
  total_score: number;
  eliminated: boolean;
  member_count: number;
  last_scan: {
    index_label: string;
    points_earned: number;
    at: string;
  } | null;
}

export default function MentorTeamsPage() {
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/admin/teams");
        const j = await res.json();
        if (j.success) setTeams(j.data);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCount = teams.filter((t) => !t.eliminated).length;
  const eliminatedCount = teams.filter((t) => t.eliminated).length;
  const totalPlayers = teams.reduce((sum, t) => sum + t.member_count, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="font-headline text-headline-xl text-on-surface">
          Team Telemetry
        </h1>
        <p className="font-body text-body-md text-on-surface-variant">
          Monitor all teams and their progress in real-time
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Total Teams
          </p>
          <p className="font-headline text-2xl text-on-surface font-bold">
            {loading ? "--" : teams.length}
          </p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Active
          </p>
          <p className="font-headline text-2xl text-primary font-bold">
            {loading ? "--" : activeCount}
          </p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Eliminated
          </p>
          <p className="font-headline text-2xl text-error font-bold">
            {loading ? "--" : eliminatedCount}
          </p>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">
            Total Players
          </p>
          <p className="font-headline text-2xl text-on-surface font-bold">
            {loading ? "--" : totalPlayers}
          </p>
        </div>
      </div>

      {teams.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-error/50 border-t border-dashed border-error" />
          <span className="font-label text-label-sm text-error uppercase">
            Elimination Line (Bottom 20%)
          </span>
          <div className="flex-1 h-px bg-error/50 border-t border-dashed border-error" />
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <p className="font-body text-body-md text-on-surface-variant animate-pulse">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">group</span>
            <p className="font-body text-body-md text-on-surface-variant">No teams yet</p>
          </div>
        ) : (
          teams.map((team) => (
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
                        team.eliminated
                          ? "text-on-surface-variant line-through"
                          : "text-on-surface"
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
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-label text-label-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">group</span>
                      {team.member_count}
                    </span>
                    <span className="font-label text-label-sm text-on-surface-variant">
                      Code: {team.invite_code}
                    </span>
                    {team.last_scan && (
                      <span className="font-label text-label-sm text-on-surface-variant">
                        Last: {team.last_scan.index_label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-headline text-xl text-primary font-bold">
                    {team.total_score}
                  </p>
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
