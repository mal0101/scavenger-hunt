"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ScanResultContent() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");
  const type = searchParams.get("type") ?? "enigma";

  let scanResult: { index_label?: string; points_earned?: number; team_total?: number } = {};
  if (data) {
    try {
      scanResult = JSON.parse(decodeURIComponent(data));
    } catch {
      // static display
    }
  }

  const isTrap = type === "trap";

  return (
    <div className="px-4 space-y-4 max-w-lg mx-auto">
      <div className="space-y-4">
        {isTrap ? (
          <Link href="/trap" className="block">
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

              <button className="w-full py-3 bg-surface-container-lowest border border-error text-error font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-error/10 transition-all flex items-center justify-center gap-2 relative z-10">
                Engage Manual Override
                <span className="material-symbols-outlined text-lg">build</span>
              </button>
            </div>
          </Link>
        ) : (
          <Link href="/enigma" className="block">
            <div className="glass-panel rounded-xl p-6 space-y-4 border-t-primary-container hover:scale-[1.02] transition-transform cursor-pointer ambient-glow">
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
                  ENIGMA UNLOCKED
                </h2>
                <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">
                  {scanResult.index_label ?? "Hydraulic Puzzle Found"}
                </p>
              </div>

              {scanResult.points_earned != null && (
                <div className="bg-surface/50 border border-outline-variant rounded-lg p-4 text-center space-y-1 brass-plate">
                  <p className="font-headline text-xl text-primary font-bold etched-text">
                    +{scanResult.points_earned} pts
                  </p>
                  {scanResult.team_total != null && (
                    <p className="font-label text-label-sm text-on-surface-variant">
                      Team total: {scanResult.team_total}
                    </p>
                  )}
                </div>
              )}

              <button className="w-full py-3 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all flex items-center justify-center gap-2">
                Initiate Sequence
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </button>
            </div>
          </Link>
        )}

        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-outline-variant" />
          <span className="font-headline text-headline-lg-mobile text-on-surface-variant italic px-3">
            Or
          </span>
          <div className="flex-1 h-px bg-outline-variant" />
        </div>

        <Link href={isTrap ? "/enigma" : "/trap"} className="block">
          <div className={`rounded-xl p-4 space-y-2 border border-outline-variant hover:scale-[1.02] transition-transform cursor-pointer ${
            isTrap ? "bg-surface/50 border-primary-container/30" : "bg-surface-container-highest border-error/30"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-2xl ${isTrap ? "text-primary-container" : "text-error"}`}>
                {isTrap ? "key" : "warning"}
              </span>
              <div>
                <p className="font-headline text-sm text-on-surface">
                  {isTrap ? "Try an Enigma Instead" : "Trigger a Trap Instead"}
                </p>
                <p className="font-label text-label-sm text-on-surface-variant">
                  {isTrap ? "Solve a puzzle for points" : "Risk it all for bonus points"}
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
