"use client";

import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useQRStore, type ScanResultPayload } from "@/stores/qr-store";

function TrapContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get("data");
  const { lastScanResult, scanType } = useQRStore();

  let challenge:
    | {
        index_label: string;
        question: string | null;
        game_id: string;
        scan_id: string;
        at_risk: number | null;
        team_total: number;
      }
    | null = null;

  if (dataParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam)) as ScanResultPayload;
      challenge = {
        index_label: parsed.index_label,
        question: parsed.question ?? null,
        game_id: parsed.game_id,
        scan_id: parsed.scan_id,
        at_risk: parsed.at_risk ?? null,
        team_total: parsed.team_total,
      };
    } catch {
      // fall through to store below
    }
  }

  if (!challenge && scanType === "trap" && lastScanResult) {
    challenge = {
      index_label: lastScanResult.index_label,
      question: lastScanResult.question ?? null,
      game_id: lastScanResult.game_id,
      scan_id: lastScanResult.scan_id,
      at_risk: lastScanResult.at_risk ?? null,
      team_total: lastScanResult.team_total,
    };
  }

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    delta: number;
    team_total: number;
  } | null>(null);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!challenge?.game_id || !challenge.scan_id || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const j = await apiFetch<{
        success: boolean;
        data?: { correct: boolean; delta: number; team_total: number };
        message?: string;
      }>(`/api/v1/games/${challenge.game_id}/trap/${challenge.scan_id}/answer`, {
        method: "POST",
        body: { answer },
      });
      if (!j.success || !j.data) {
        setError(j.message || "Failed to submit answer");
        return;
      }
      setResult(j.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Network error submitting answer"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const answered = result !== null;

  if (!challenge) {
    return (
      <div className="px-4 space-y-6 max-w-md mx-auto">
        <div className="bg-surface-container rounded-xl p-8 text-center border border-outline-variant/30">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-3 block">
            error_outline
          </span>
          <p className="font-headline text-lg text-on-surface mb-2">
            No Trap Data
          </p>
          <p className="font-body text-body-md text-on-surface-variant mb-4">
            Trap challenge data is no longer available. Scan a trap QR code to trigger a challenge.
          </p>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all"
          >
            <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
            Scan Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-6 max-w-md mx-auto">
      {answered ? (
        <div
          className={`bg-surface-container-lowest border rounded-2xl p-6 space-y-4 text-center animate-fade-in-up ${
            result!.correct ? "border-primary/40" : "border-error/50"
          }`}
        >
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(217,119,7,0.3)] ${
              result!.correct
                ? "bg-primary-container border border-primary"
                : "bg-error border border-error"
            }`}
          >
            <span className="material-symbols-outlined text-4xl text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              {result!.correct ? "check_circle" : "flood"}
            </span>
          </div>
          <div>
            <h3
              className={`font-headline text-headline-lg-mobile ${
                result!.correct ? "text-primary" : "text-error"
              } ${result!.correct ? "" : "glitch-text"}`}
              data-text={result!.correct ? "" : "MANIFOLD BREACHED"}
            >
              {result!.correct ? "TRAP AVOIDED" : "MANIFOLD BREACHED"}
            </h3>
            <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">
              {result!.correct
                ? `+${result!.delta} pts earned (50% of the points at risk)`
                : `-${Math.abs(result!.delta)} pts lost`}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link
              href="/scan"
              className="px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all"
            >
              Scan Again
            </Link>
            <Link
              href="/dock"
              className="px-4 py-2 bg-surface-container-high text-on-surface font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-highest transition-all"
            >
              Return to Dock
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2 mt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-error-container border border-error/50 animate-flicker shadow-[0_0_15px_rgba(255,180,171,0.3)]">
              <span className="material-symbols-outlined text-on-error-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
              <span className="font-label text-label-sm text-on-error-container tracking-widest">
                CRITICAL PRESSURE BREACH
              </span>
            </div>
            <h1 className="font-headline text-headline-xl text-on-surface drop-shadow-md etched-text-error">
              Tidal Trap
            </h1>
            <div className="font-label text-label-md text-outline flex items-center gap-2">
              <span>SEQ OVERRIDE</span>
              <span className="w-1 h-1 rounded-full bg-outline" />
              <span>{challenge.index_label ?? "VAULT SECURE"}</span>
            </div>
          </div>

          {/* Question */}
          <div className="bg-surface-container-lowest border border-error/40 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error text-2xl">
                sensors
              </span>
              <div>
                <p className="font-label text-label-sm text-error uppercase tracking-widest">
                  PRESSURE VAULT QUERY
                </p>
                <p className="font-body text-body-md text-on-surface-variant mt-0.5">
                  Answer correctly to earn {challenge.at_risk != null ? `50% of ${challenge.at_risk} pts` : "points"}. A wrong
                  answer costs {challenge.at_risk != null ? `-${challenge.at_risk} pts` : "points"}. Answers are case-insensitive.
                </p>
              </div>
            </div>
            <div className="bg-surface/50 border border-outline-variant rounded-xl p-4">
              <p className="font-body text-body-lg text-on-surface">
                {challenge.question ?? "No question available for this trap."}
              </p>
            </div>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Enter your answer…"
              autoFocus
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body text-body-md text-on-surface focus:outline-none focus:border-error"
            />
            {error && (
              <div className="bg-error-container/20 border border-error/40 rounded-lg p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-error">error</span>
                <p className="font-label text-label-sm text-error">{error}</p>
              </div>
            )}
            <button
              onClick={submit}
              disabled={!answer.trim() || submitting || !challenge.scan_id}
              className="w-full py-3.5 bg-error text-on-error font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">vpn_key</span>
              {submitting ? "Sealing…" : "Seal the Bulkhead"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TrapPage() {
  return (
    <Suspense fallback={<div className="px-4 max-w-md mx-auto pt-8" />}>
      <TrapContent />
    </Suspense>
  );
}
