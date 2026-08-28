"use client";

import { useCallback, useEffect, useState } from "react";
import { useCamera } from "@/hooks/use-camera";
import { useQRStore } from "@/stores/qr-store";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface ActiveGame {
  id: string;
  title: string;
  current_round: number;
}

export default function ScanPage() {
  const router = useRouter();
  const { showScanError, setShowScanError } = useQRStore();
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found">("idle");
  const [game, setGame] = useState<ActiveGame | null>(null);
  const [gameLoading, setGameLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    apiFetch<{ success: boolean; data: ActiveGame | null }>("/api/v1/games/active")
      .then((j) => {
        if (j.success && j.data) setGame(j.data);
      })
      .catch(() => {})
      .finally(() => setGameLoading(false));
  }, []);

  const handleScan = useCallback(
    async (data: string) => {
      if (!game) {
        setSubmitError("No active hunt to scan against.");
        return;
      }
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
            index: { id: string; label: string; type: string | null };
          };
          message?: string;
        };

        if (!j.success || !j.data) {
          throw new Error(j.message || "Scan validation failed");
        }

        const type = j.data.index.type === "trap" ? "trap" : "enigma";
        const payload = encodeURIComponent(
          JSON.stringify({
            index_label: j.data.index.label,
            points_earned: j.data.points_earned,
            team_total: j.data.team_total,
            scan_id: j.data.scan_id,
          })
        );
        router.push(`/scan-result?type=${type}&data=${payload}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to process scan";
        setSubmitError(message);
        setScanStatus("idle");
      } finally {
        setSubmitting(false);
      }
    },
    [game, router]
  );

  const handleError = useCallback(
    (error: string) => {
      setShowScanError(true);
      console.error("Scan error:", error);
    },
    [setShowScanError]
  );

  const { scanning, hasCamera, startScanning, stopScanning } = useCamera({
    onScan: handleScan,
    onError: handleError,
  });

  const toggleScanning = async () => {
    if (submitting) return;
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
      {/* Scanner Viewfinder */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-container-lowest border-2 border-outline-variant">
        <div
          id="qr-reader"
          className={`absolute inset-0 ${scanning ? "z-10" : "hidden"}`}
        />

        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {scanStatus === "found" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-4xl animate-spin">
                    progress_activity
                  </span>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-headline text-headline-lg-mobile text-primary">
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
                  <span className="material-symbols-outlined text-primary text-4xl">
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

      {/* Error message */}
      {showScanError && (
        <div className="bg-error-container/20 border border-error/30 rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <div className="flex-1">
            <p className="font-body text-body-md text-on-surface">
              Camera permission denied or not available.
            </p>
          </div>
          <button
            onClick={() => setShowScanError(false)}
            className="text-on-surface-variant hover:text-error"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="bg-error-container/20 border border-error/30 rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-error">report</span>
          <div className="flex-1">
            <p className="font-body text-body-md text-on-surface">{submitError}</p>
          </div>
          <button
            onClick={() => setSubmitError("")}
            className="text-on-surface-variant hover:text-error"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={toggleScanning}
        disabled={!hasCamera || submitting || (gameLoading && !game)}
        className="w-full py-4 rounded-xl bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-lg">
          {scanning ? "stop" : submitting ? "progress_activity" : "qr_code_scanner"}
        </span>
        {scanning
          ? "Stop Scanning"
          : submitting
            ? "Verifying..."
            : hasCamera
              ? game
                ? "Start Scanner"
                : "Awaiting Hunt"
              : "Camera Unavailable"}
      </button>
    </div>
  );
}
