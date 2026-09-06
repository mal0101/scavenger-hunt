"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useQRStore, type ScanResultPayload } from "@/stores/qr-store";

function ScanResultContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? "index";
  const dataParam = searchParams.get("data");
  const { lastScanResult, clearScanResult } = useQRStore();

  const isTrap = type === "trap";

  useEffect(() => {
    return () => {
      clearScanResult();
    };
  }, [clearScanResult]);

  let scanResult: ScanResultPayload;

  if (dataParam) {
    try {
      scanResult = JSON.parse(decodeURIComponent(dataParam)) as ScanResultPayload;
    } catch {
      scanResult = lastScanResult ?? {
        index_label: "",
        game_id: "",
        points_earned: 0,
        team_total: 0,
        scan_id: "",
      };
    }
  } else {
    scanResult = lastScanResult ?? {
      index_label: "",
      game_id: "",
      points_earned: 0,
      team_total: 0,
      scan_id: "",
    };
  }

  if (!scanResult.index_label && !scanResult.scan_id) {
    return (
      <div className="px-4 space-y-4 max-w-lg mx-auto">
        <div className="bg-surface-container rounded-xl p-8 text-center border border-outline-variant/30">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-3 block">
            error_outline
          </span>
          <p className="font-headline text-lg text-on-surface mb-2">
            No Scan Data
          </p>
          <p className="font-body text-body-md text-on-surface-variant mb-4">
            Scan result data is no longer available. This may happen if you navigated
            here directly or refreshed the page.
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
    <div className="px-4 space-y-4 max-w-lg mx-auto">
      <div className="space-y-4">
        {isTrap ? (
          <Link
            href={`/trap?data=${encodeURIComponent(dataParam ?? "")}`}
            className="block"
          >
            <div className="bg-surface-container-highest rounded-xl p-6 space-y-4 border-t-error border-l border-r border-b border-outline-variant hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden ambient-glow">
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  background:
                    "repeating-linear-gradient(45deg, #000, #000 10px, #ffb4ab 10px, #ffb4ab 20px)",
                }}
              />

              <div className="flex justify-center relative">
                <div className="porthole border-error bg-surface-container-lowest">
                  <div className="absolute inset-2 rounded-full border-2 border-error/50 bg-error-container/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-error animate-pulse">
                      warning
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center relative z-10">
                <h2 className="font-headline text-headline-lg-mobile text-error glitch-text" data-text="TRAP TRIGGERED">
                  TRAP TRIGGERED
                </h2>
                <p className="font-label text-label-sm text-error uppercase tracking-widest mt-1 animate-pulse">
                  Critical Pressure Loss
                </p>
              </div>

              <div className="bg-error-container/20 border border-error/30 rounded-lg p-4 relative z-10">
                <p className="font-body text-body-md text-on-surface-variant">
                  Hull integrity compromised. Bypass the primary manifold controls
                  to seal the bulkhead.
                </p>
              </div>

              {scanResult.question && (
                <div className="bg-surface-container-lowest border border-error/30 rounded-lg p-4 relative z-10">
                  <p className="font-label text-label-sm text-error uppercase tracking-widest mb-1">
                    Trap Question · {scanResult.at_risk != null ? `Lose ${scanResult.at_risk} pts if wrong` : "Answer correctly"}
                  </p>
                  <p className="font-body text-body-md text-on-surface">
                    {scanResult.question}
                  </p>
                  <p className="font-label text-label-sm text-on-surface-variant mt-2">
                    Answer right to earn 50% of the points at risk.
                  </p>
                </div>
              )}

              <button className="w-full py-3 bg-surface-container-lowest border border-error text-error font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-error/10 transition-all flex items-center justify-center gap-2 relative z-10">
                Engage Manual Override
                <span className="material-symbols-outlined text-lg">build</span>
              </button>
            </div>
          </Link>
        ) : (
          <div className="glass-panel rounded-xl p-6 space-y-4 border-t-primary-container">
            <div className="flex justify-center">
              <div className="porthole">
                <div className="porthole-rivet top-2 left-1/2 -translate-x-1/2" />
                <div className="porthole-rivet bottom-2 left-1/2 -translate-x-1/2" />
                <div className="porthole-rivet left-2 top-1/2 -translate-y-1/2" />
                <div className="porthole-rivet right-2 top-1/2 -translate-y-1/2" />
                <div className="absolute inset-2 rounded-full border-2 border-primary-container/30 bg-surface flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary-container animate-flicker-amber">
                    key
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h2 className="font-headline text-headline-lg-mobile text-primary etched-text">
                CHECKPOINT SECURED
              </h2>
              <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">
                {scanResult.index_label || "Index Found"}
              </p>
            </div>

            <div className="bg-surface/50 border border-outline-variant rounded-lg p-4 text-center space-y-1 brass-plate">
              <p className="font-headline text-xl text-primary font-bold etched-text">
                +{scanResult.points_earned} pts
              </p>
              <p className="font-label text-label-sm text-on-surface-variant">
                Team total: {scanResult.team_total}
              </p>
            </div>

            <Link
              href="/dock"
              className="w-full py-3 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all flex items-center justify-center gap-2"
            >
              Return to Dock
              <span className="material-symbols-outlined text-lg">
                arrow_forward
              </span>
            </Link>
          </div>
        )}

        <Link href="/scan" className="block">
          <div className="rounded-xl p-4 space-y-2 border border-outline-variant hover:scale-[1.02] transition-transform cursor-pointer bg-surface/50 border-primary-container/30">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary-container">
                qr_code_scanner
              </span>
              <div>
                <p className="font-headline text-sm text-on-surface">
                  Scan Another Code
                </p>
                <p className="font-label text-label-sm text-on-surface-variant">
                  Keep hunting for points
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function ScanResultPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 max-w-lg mx-auto space-y-4 pt-8">
          <div className="glass-panel rounded-xl p-6 animate-pulse">
            <div className="h-24 bg-surface-container rounded" />
          </div>
        </div>
      }
    >
      <ScanResultContent />
    </Suspense>
  );
}
