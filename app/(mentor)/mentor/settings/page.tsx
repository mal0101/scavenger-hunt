"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface RuntimeData {
  environment: string;
  database: { provider: string; configured: boolean };
  redis: { mode: string; configured: boolean };
  auth: { provider: string; access_expiry_seconds: number; refresh_expiry_seconds: number };
  game: {
    max_rounds: number;
    round_duration: number;
    elimination_pct: number;
    max_scans_per_minute: number;
  };
  mentor: { id: string; phone: string };
  sse: { heartbeat_interval: number; timer_sync_interval: number };
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
      <p className="font-label text-label-sm text-on-surface-variant uppercase">
        {label}
      </p>
      <p className={`font-headline text-sm ${accent ? "text-primary" : "text-on-surface"}`}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container rivet-corners rounded-xl border border-outline-variant/30 p-6 space-y-4">
      <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function MentorSettingsPage() {
  const router = useRouter();
  const [runtime, setRuntime] = useState<RuntimeData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const j = await apiFetch<{ success: boolean; data: RuntimeData }>("/api/v1/admin/runtime");
        if (j.success) setRuntime(j.data);
        else setStatus("error");
      } catch (err) {
        console.error("Runtime load error:", err);
        setStatus("error");
      } finally {
        setStatus("ready");
      }
    }
    load();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // proceed regardless
    } finally {
      router.replace("/login");
    }
  }

  const statusDot =
    status === "error" ? "bg-error" : "bg-primary-container animate-pulse";

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
          <span
            className={`px-2.5 py-0.5 rounded-full font-label text-label-sm font-bold uppercase ${
              status === "ready"
                ? "bg-primary-container/20 text-primary border border-primary/30"
                : "bg-surface-container-high text-on-surface-variant border border-outline-variant/30"
            }`}
          >
            {status === "loading" ? "Polling runtime..." : status === "error" ? "Partial" : "Operational"}
          </span>
        </div>
        <h1 className="font-headline text-headline-xl text-on-surface pt-2">
          Operations Console
        </h1>
        <p className="font-body text-body-md text-on-surface-variant">
          Live runtime configuration and session control
        </p>
      </div>

      {runtime && (
        <>
          <Section title="Environment">
            <Row
              label="Runtime"
              value={runtime.environment}
              accent
            />
            <Row
              label="Database"
              value={
                runtime.database.configured
                  ? `${runtime.database.provider} · connected`
                  : `${runtime.database.provider} · not configured`
              }
              accent={runtime.database.configured}
            />
            <Row
              label="Redis"
              value={
                runtime.redis.configured
                  ? "Upstash (online)"
                  : "Local mock (rate limits pass-through)"
              }
              accent={runtime.redis.configured}
            />
            <Row
              label="Authentication"
              value={
                runtime.auth.provider === "credentials"
                  ? "Credentials (username + password)"
                  : runtime.auth.provider
              }
              accent
            />
          </Section>

          <Section title="Live Configuration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Row
                label="Access Token"
                value={`${runtime.auth.access_expiry_seconds}s`}
              />
              <Row
                label="Refresh Token"
                value={`${Math.round(runtime.auth.refresh_expiry_seconds / 86400)}d`}
              />
              <Row
                label="Scans / min / player"
                value={String(runtime.game.max_scans_per_minute)}
              />
              <Row label="Default Rounds" value={String(runtime.game.max_rounds)} />
              <Row
                label="Round Duration"
                value={`${Math.round(runtime.game.round_duration / 60)} min`}
              />
              <Row
                label="Default Elimination"
                value={`${Math.round(runtime.game.elimination_pct * 100)}%`}
              />
              <Row
                label="SSE Timer Sync"
                value={`${runtime.sse.timer_sync_interval}ms`}
              />
            </div>
          </Section>

          <Section title="Session">
            <div className="space-y-3">
              <Row label="Mentor ID" value={runtime.mentor.id.slice(0, 12) + "…"} accent />
              <Row label="Phone" value={runtime.mentor.phone} accent />
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-4 py-2 bg-error-container/20 border border-error/40 text-error font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-error/10 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </Section>

          <p className="font-label text-label-sm text-on-surface-variant/70">
            Note: Knobs such as token expiry, refresh window and scan rate limits are
            governed by environment variables on the server. Use the dashboard and
            game-level controls for run-time changes.
          </p>
        </>
      )}

      {!runtime && status === "ready" && (
        <Section title="Runtime unavailable">
          <p className="text-on-surface-variant font-body">
            Could not load runtime configuration. Check the server logs.
          </p>
        </Section>
      )}
    </div>
  );
}
