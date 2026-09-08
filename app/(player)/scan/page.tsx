"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "@/hooks/use-camera";
import { useQRStore } from "@/stores/qr-store";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { ActiveGameView } from "@/lib/types/api-responses";

export default function ScanPage() {
  const router = useRouter();
  const { setScanResult } = useQRStore();
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found">("idle");
  const [game, setGame] = useState<ActiveGameView | null>(null);
  const [gameLoading, setGameLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [eliminated, setEliminated] = useState(false);
  const scanInFlightRef = useRef(false);

  useEffect(() => {
    apiFetch<{ success: boolean; data: ActiveGameView | null }>("/api/v1/games/active")
      .then((j) => {
        if (j.success && j.data) setGame(j.data);
      })
      .catch(() => {})
      .finally(() => setGameLoading(false));

    // An eliminated team must not be able to scan: surface the elimination
    // state up front instead of letting the player into the scanner.
    apiFetch<{
      success: boolean;
      data?: { team: { eliminated: boolean } | null };
    }>("/api/v1/players/me")
      .then((j) => {
        if (j.success && j.data?.team?.eliminated) {
          setEliminated(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleScan = useCallback(
    async (data: string) => {
      if (scanInFlightRef.current) return;
      if (!game) {
        setSubmitError("No active hunt to scan against.");
        return;
      }
      scanInFlightRef.current = true;
      setScanStatus("found");
      setSubmitting(true);
      setSubmitError("");

      try {
        const j = (await apiFetch(`/api/v1/games/${game.id}/scan`, {
          method: "POST",
          body: { qr_data: data },
        })) as {
          success: boolean;
          data?: {
            scan_id: string;
            points_earned: number;
            team_total: number;
            pending?: boolean;
            display_code?: string | null;
            question?: string | null;
            answer_options?: string[] | null;
            hint?: string | null;
            at_risk?: number;
            index: { id: string; label: string; type: string | null; sequence_order?: number };
          };
          message?: string;
          error?: string;
        };

        if (!j.success || !j.data) {
          // Silently ignore scans of already-scanned indexes
          if (j.message && j.message.includes("already scanned")) {
            setScanStatus("idle");
            return;
          }
          if (j.error === "TEAM_ELIMINATED") {
            setEliminated(true);
            setSubmitError("Your team has been eliminated and cannot scan.");
          } else if (j.error === "NO_TEAM") {
            setSubmitError("You must be in a team to scan");
          } else if (j.error === "SEQUENCE_LOCKED") {
            setSubmitError(
              "Checkpoint locked — scan the previous marker in the sequence first."
            );
          } else {
            setSubmitError(j.message || "Scan validation failed");
          }
          setScanStatus("idle");
          return;
        }

        const type = j.data.index.type === "trap" ? "trap" : "index";
        const payload = {
          index_label: j.data.index.label,
          game_id: game.id,
          points_earned: j.data.points_earned,
          team_total: j.data.team_total,
          scan_id: j.data.scan_id,
          display_code: j.data.display_code ?? null,
          question: j.data.question ?? null,
          answer_options: j.data.answer_options ?? null,
          hint: j.data.hint ?? null,
          at_risk: j.data.at_risk ?? null,
        };
        setScanResult(payload, type);
        router.push(
          `/scan-result?type=${type}&data=${encodeURIComponent(JSON.stringify(payload))}`
        );
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to process scan";
        setSubmitError(message);
        setScanStatus("idle");
      } finally {
        setSubmitting(false);
        scanInFlightRef.current = false;
      }
    },
    [game, router, setScanResult]
  );

  const handleError = useCallback(
    (error: string) => {
      setSubmitError(error);
      console.error("Scan error:", error);
    },
    []
  );

  const { scanning, startScanning, stopScanning } = useCamera({
    onScan: handleScan,
    onError: handleError,
  });

  const toggleScanning = async () => {
    if (submitting || eliminated) return;
    if (scanning) {
      await stopScanning();
      setScanStatus("idle");
    } else {
      setScanStatus("scanning");
      await startScanning("qr-reader");
    }
  };

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      {eliminated ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-error-container border-2 border-error flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-4xl">
              cancel
            </span>
          </div>
          <p className="font-headline text-headline-lg-mobile text-on-surface">
            You Have Been Eliminated
          </p>
          <p className="font-body text-body-md text-on-surface-variant">
            Your team is out of the hunt and can no longer scan checkpoints or
            play challenges.
          </p>
        </div>
      ) : (
        <>
      {/* Scanner Viewfinder */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-container-lowest border-2 border-outline-variant">
        <div
          id="qr-reader"
          role="img"
          aria-label="QR code scanner viewfinder"
          className={`absolute inset-0 ${scanning ? "z-10" : "hidden"}`}
        />

        {/* Steampunk scan frame */}
        <div className="absolute inset-4 pointer-events-none z-30">
          <span className="scan-corner tl" />
          <span className="scan-corner tr" />
          <span className="scan-corner bl" />
          <span className="scan-corner br" />
        </div>

        {scanning && <div className="scan-sweep z-30" />}

        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {scanStatus === "found" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_30px_rgba(217,119,7,0.5)]">
                  <span className="material-symbols-outlined text-on-primary-container text-4xl animate-spin">
                    progress_activity
                  </span>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-headline text-headline-lg-mobile text-primary etched-text">
                    {submitting ? "Decoding..." : "QR Code Found!"}
                  </p>
                  <p className="font-body text-body-md text-on-surface-variant">
                    {submitting
                      ? "Verifying cryptographic signature..."
                      : "Processing scan result..."}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-surface-container-high border-2 border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl animate-flicker-amber">
                    qr_code_scanner
                  </span>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-headline text-headline-lg-mobile text-on-surface">
                    Ready to Scan
                  </p>
                  <p className="font-body text-body-md text-on-surface-variant">
                    {game
                      ? `Round ${game.current_round} of ${game.title}`
                      : gameLoading
                        ? "Contacting the vault..."
                        : "No active hunt. Awaiting launch."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {scanning && (
          <div className="absolute top-3 left-3 bg-surface/80 border border-outline-variant rounded px-2 py-1 flex items-center gap-1.5 z-20">
            <span className="material-symbols-outlined text-primary text-sm">
              speed
            </span>
            <span className="font-label text-label-sm text-primary animate-pulse">
              SCANNING
            </span>
          </div>
        )}
      </div>

      {/* Scan / camera error banner */}
      {submitError && (
        <div className="bg-error-container/20 border border-error/40 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body text-body-md text-on-surface flex-1">
            {submitError}
          </p>
          <button
            onClick={() => setSubmitError("")}
            aria-label="Dismiss scan error"
            className="material-symbols-outlined text-on-surface-variant text-lg"
          >
            close
          </button>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={toggleScanning}
        disabled={submitting || (gameLoading && !game)}
        className="w-full py-4 rounded-xl bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-lg">
          {scanning ? "stop" : submitting ? "progress_activity" : "qr_code_scanner"}
        </span>
        {scanning
          ? "Stop Scanning"
          : submitting
            ? "Verifying..."
            : game
              ? "Start Scanner"
              : "Awaiting Hunt"}
      </button>
        </>
      )}
    </div>
  );
}
