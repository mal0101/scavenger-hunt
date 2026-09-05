"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface TeamMember {
  id: string;
  user_id: string;
  username: string;
  nickname: string | null;
  total_score: number;
  status: string;
  is_captain: boolean;
  is_me: boolean;
}

interface TeamData {
  id: string;
  name: string;
  invite_code: string;
  total_score: number;
  eliminated: boolean;
  game_id: string;
  captain_id: string | null;
  is_captain: boolean;
  member_count: number;
  members: TeamMember[];
}

interface TeamResponse {
  success: boolean;
  data: { team: TeamData | null };
  error?: { message: string; code: string };
}

interface ApiResult {
  success: boolean;
  error?: { message: string; code: string };
}

export default function TeamPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [invite, setInvite] = useState("");

  async function fetchTeam() {
    try {
      const res = await apiFetch<TeamResponse>("/api/v1/players/me/team");
      setError(null);
      if (res.success) {
        setTeam(res.data.team);
      } else {
        setError(res.error?.message ?? "Failed to load team");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      await fetchTeam();
    }
    load();
  }, []);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResult & { data?: { id: string } }>(
        "/api/v1/players/me/team",
        { method: "POST", body: { team_name: teamName.trim() } }
      );
      if (res.success) {
        setTeamName("");
        await fetchTeam();
      } else {
        setError(res.error?.message ?? "Failed to create team");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinTeam(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResult & { data?: { id: string } }>(
        "/api/v1/players/me/team",
        { method: "POST", body: { invite_code: invite.trim().toUpperCase() } }
      );
      if (res.success) {
        setInvite("");
        await fetchTeam();
      } else {
        setError(res.error?.message ?? "Failed to join team");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join team");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!team || busy) return;
    if (!window.confirm("Leave this team? You must rejoin via an invite code.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResult>("/api/v1/players/me/team", {
        method: "DELETE",
      });
      if (res.success) {
        setTeam(null);
        router.refresh();
      } else {
        setError(res.error?.message ?? "Failed to leave team");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave team");
    } finally {
      setBusy(false);
    }
  }

  async function handleKick(memberId: string) {
    if (!team || busy) return;
    const member = team.members.find((m) => m.id === memberId);
    if (!member) return;
    if (
      !window.confirm(
        `Remove ${member.nickname ?? member.username} from "${team.name}"?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResult>(
        `/api/v1/players/me/team/members/${memberId}`,
        { method: "DELETE" }
      );
      if (res.success) {
        await fetchTeam();
      } else {
        setError(res.error?.message ?? "Failed to remove member");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setBusy(false);
    }
  }

  async function handleTransfer(memberId: string) {
    if (!team || busy) return;
    const member = team.members.find((m) => m.id === memberId);
    if (!member) return;
    if (
      !window.confirm(
        `Transfer leadership to ${member.nickname ?? member.username}?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResult>(
        `/api/v1/players/me/team/members/${memberId}`,
        { method: "PATCH" }
      );
      if (res.success) {
        await fetchTeam();
      } else {
        setError(res.error?.message ?? "Failed to transfer leadership");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer leadership");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyInvite() {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy invite code");
    }
  }

  function displayName(m: TeamMember) {
    return m.nickname ?? m.username;
  }

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="glass-panel rounded-xl p-5 space-y-3 mt-2 relative overflow-hidden ambient-glow">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">
            groups
          </span>
          <h2 className="font-label text-label-sm text-primary uppercase tracking-widest">
            Your Crew
          </h2>
        </div>
        <h1 className="font-headline text-headline-lg-mobile text-on-surface">
          {loading ? "Loading..." : team ? team.name : "No Team"}
        </h1>

        {error && (
          <div className="px-3 py-2 bg-error/10 border border-error/40 rounded-lg text-error text-sm" role="alert">
            {error}
          </div>
        )}

        {!loading && !team && !error && (
          <div className="space-y-4 pt-1">
            <p className="font-body text-sm text-on-surface-variant">
              You are not part of a team yet. Start your own crew or join one with a
              6-character invite code.
            </p>

            <form
              onSubmit={handleCreateTeam}
              className="space-y-2 bg-surface-container/50 border border-outline-variant/50 rounded-lg p-3"
            >
              <label
                htmlFor="team-name"
                className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest"
              >
                Name your crew
              </label>
              <div className="flex gap-2">
                <input
                  id="team-name"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Crew name"
                  maxLength={50}
                  className="flex-1 min-w-0 px-3 py-2 bg-surface-container-high border border-outline-variant/60 rounded-lg font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={busy || teamName.trim().length === 0}
                  className="shrink-0 px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.4)] transition-all disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant/40" />
              <span className="font-label text-label-sm text-on-surface-variant uppercase">
                or
              </span>
              <div className="flex-1 h-px bg-outline-variant/40" />
            </div>

            <form
              onSubmit={handleJoinTeam}
              className="space-y-2 bg-surface-container/50 border border-outline-variant/50 rounded-lg p-3"
            >
              <label
                htmlFor="invite-code"
                className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest"
              >
                Join with invite code
              </label>
              <div className="flex gap-2">
                <input
                  id="invite-code"
                  type="text"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="flex-1 min-w-0 px-3 py-2 bg-surface-container-high border border-outline-variant/60 rounded-lg font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/60 uppercase tracking-widest"
                />
                <button
                  type="submit"
                  disabled={busy || invite.trim().length !== 6}
                  className="shrink-0 px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(217,119,7,0.4)] transition-all disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        )}

        {team && (
          <div className="engraved-separator my-1" />
        )}
        {team && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-label text-label-sm text-on-surface-variant uppercase">Invite Code</span>
              <button
                onClick={handleCopyInvite}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/20 border border-primary/40 text-primary font-label text-label-sm uppercase tracking-widest hover:bg-primary-container/30 transition-all"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied" : team.invite_code}
              </button>
            </div>
            {team.is_captain && (
              <p className="font-body text-xs text-primary/80 pt-1">
                Share this code — new crewmates can join up to {team.members.length}/4.
              </p>
            )}
          </div>
        )}
      </div>

      {team && (
        <div className="wood-grain rounded-xl p-5 space-y-4 brass-plate">
          <h3 className="font-headline text-headline-lg-mobile text-on-surface pb-2 text-primary">
            Crewmates
          </h3>
          <ul className="space-y-3">
            {team.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 bg-surface-container/50 border border-outline-variant/50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-container/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">
                      {member.is_captain ? "emoji_events" : "person"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-sm text-on-surface font-semibold truncate">
                      {displayName(member)}
                      {member.is_me && (
                        <span className="text-on-surface-variant font-normal"> (you)</span>
                      )}
                    </p>
                    <p className="font-label text-label-xs text-on-surface-variant uppercase">
                      {member.is_captain ? "Captain" : "Crewmate"} · {member.total_score} pts
                    </p>
                  </div>
                </div>
                {team.is_captain && !member.is_captain && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTransfer(member.id)}
                      disabled={busy}
                      className="px-2 py-1 rounded-full border border-primary/40 text-primary font-label text-label-xs uppercase tracking-widest hover:bg-primary-container/20 transition-all"
                      title="Transfer leadership"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">swap_horiz</span>
                    </button>
                    <button
                      onClick={() => handleKick(member.id)}
                      disabled={busy}
                      className="px-2 py-1 rounded-full border border-error/50 text-error font-label text-label-xs uppercase tracking-widest hover:bg-error/10 transition-all"
                      title="Remove from team"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">person_remove</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="engraved-separator my-1" />
          {!team.is_captain && (
            <button
              onClick={handleLeave}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/60 text-on-surface-variant font-label text-label-sm uppercase tracking-widest hover:border-error hover:text-error transition-all"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">logout</span>
              Leave Team
            </button>
          )}
        </div>
      )}

      {team && team.is_captain && (
        <div className="bg-surface-container border-t-2 border-primary-container border-x border-b border-outline-variant/50 rounded-xl p-5">
          <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
            Captain Controls
          </p>
          <p className="font-body text-sm text-on-surface-variant pt-1">
            You lead this crew. Kick crewmates or hand over leadership using the buttons
            next to each member. If you&#39;re the last member, you can leave (and the team
            is disbanded).
          </p>
        </div>
      )}
    </div>
  );
}