"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/error-state";
import type { MentorTeamTelemetry } from "@/lib/types/api-responses";

const REFRESH_MS = 10000;

export default function MentorTeamDetailPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [team, setTeam] = useState<MentorTeamTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const j = await apiFetch<{ success: boolean; data: MentorTeamTelemetry }>(
          `/api/v1/admin/teams/${teamId}/telemetry`
        );
        if (active && j.success) {
          setTeam(j.data);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load team");
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
  }, [teamId, retryKey]);

  if (loading && !team) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <p className="font-body text-on-surface-variant animate-pulse">Loading team...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {error ? (
          <ErrorState
            title="Failed to load team"
            message={error}
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        ) : (
          <p className="font-body text-on-surface-variant">Team not found</p>
        )}
      </div>
    );
  }

  const pendingScans = team.scans.filter((s) => !s.resolved).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/mentor/teams"
          className="text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1 space-y-1">
          <h1 className="font-headline text-headline-xl text-on-surface">
            {team.name}
          </h1>
          <p className="font-body text-body-md text-on-surface-variant">
            Scan ledger · auto-refreshes every {REFRESH_MS / 1000}s
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full font-label text-label-sm font-bold uppercase ${
            team.eliminated
              ? "bg-error-container/10 text-error"
              : "bg-primary-container/10 text-primary"
          }`}
        >
          {team.eliminated ? "ELIMINATED" : "ACTIVE"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Team Score</p>
          <p className="font-headline text-2xl text-primary font-bold">{team.total_score}</p>
        </div>
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Members</p>
          <p className="font-headline text-2xl text-on-surface font-bold">{team.member_count}</p>
        </div>
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Scans</p>
          <p className="font-headline text-2xl text-on-surface font-bold">{team.scans.length}</p>
        </div>
        <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-4">
          <p className="font-label text-label-sm text-on-surface-variant uppercase">Unresolved Traps</p>
          <p className="font-headline text-2xl text-warning font-bold">{pendingScans}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-on-surface-variant">
        <span className="font-label text-label-sm uppercase tracking-widest">
          Invite code: <span className="text-on-surface font-bold">{team.invite_code}</span>
        </span>
        <span className="font-label text-label-sm uppercase tracking-widest">
          Captain:{" "}
          <span className="text-on-surface font-bold">
            {team.captain_username ?? "—"}
          </span>
        </span>
      </div>

      <div className="space-y-4">
        <section>
          <h2 className="font-headline text-headline-md text-on-surface mb-3">Members</h2>
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 overflow-hidden">
            {team.players.length === 0 ? (
              <p className="font-body text-body-md text-on-surface-variant p-4">No members</p>
            ) : (
              team.players.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 px-4 py-3 ${
                    i > 0 ? "border-t border-outline-variant/20" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-headline text-sm text-on-surface truncate">
                      {p.nickname ?? p.username}
                      {p.username === team.captain_username && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-container border border-primary/30 font-label text-label-xs text-primary">
                          CAPTAIN
                        </span>
                      )}
                    </p>
                    <p className="font-label text-label-sm text-on-surface-variant truncate">
                      @{p.username} · {p.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-headline text-sm text-primary font-bold">{p.total_score}</p>
                    <p className="font-label text-label-xs text-on-surface-variant">pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-headline text-headline-md text-on-surface mb-3">Scan Ledger</h2>
          <div className="bg-surface-container rounded-xl border border-outline-variant/30 overflow-hidden">
            {team.scans.length === 0 ? (
              <p className="font-body text-body-md text-on-surface-variant p-4">
                This team has no recorded scans yet.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {team.scans.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-headline text-sm text-on-surface truncate">
                        {s.index_label}
                      </p>
                      <p className="font-label text-label-sm text-on-surface-variant truncate">
                        {s.scanned_by?.nickname ?? s.scanned_by?.username ?? "unknown"}
                        {" · "}
                        {new Date(s.scanned_at).toLocaleString()}
                        {s.resolved === false && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-warning-container/10 text-warning font-label text-label-xs uppercase">
                            Pending answer
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-headline text-base font-bold ${
                          s.points_earned >= 0 ? "text-primary" : "text-error"
                        }`}
                      >
                        {s.points_earned > 0 ? "+" + s.points_earned : s.points_earned}
                      </p>
                      <p className="font-label text-label-xs text-on-surface-variant">
                        {s.index_points} at risk
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}