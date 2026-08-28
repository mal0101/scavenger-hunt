"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const TRAP_TIME = 30;

function TrapContent() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  let challenge: { index_label?: string; points_earned?: number; team_total?: number } = {};
  if (data) {
    try {
      challenge = JSON.parse(decodeURIComponent(data));
    } catch {
      // static
    }
  }

  const relays = useMemo(
    () => [
      { id: "A", label: "LVL-01", order: 2 },
      { id: "B", label: "LVL-02", order: 1 },
      { id: "C", label: "LVL-03", order: 4 },
      { id: "D", label: "LVL-04", order: 3 },
    ],
    []
  );

  const [lit, setLit] = useState<Record<string, boolean>>({});
  const [sequence, setSequence] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(TRAP_TIME);
  const [status, setStatus] = useState<"running" | "sealed" | "breached">("running");
  const [errorFlash, setErrorFlash] = useState(false);

  const litCount = relays.filter((r) => lit[r.id]).length;

  const activate = useCallback(
    (id: string) => {
      if (status !== "running" || lit[id]) return;

      const nextStep = sequence.length;
      const expected = relays.find((r) => r.order === nextStep + 1);
      const newSeq = [...sequence, id];
      setSequence(newSeq);

      if (expected && id === expected.id) {
        setLit((prev) => ({ ...prev, [id]: true }));
        if (newSeq.length === relays.length) {
          setStatus("sealed");
        }
      } else {
        setErrorFlash(true);
        setTimeout(() => {
          setLit({});
          setSequence([]);
          setErrorFlash(false);
        }, 700);
      }
    },
    [lit, relays, sequence, status]
  );

  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setStatus("breached");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const waterPct = 60 + ((TRAP_TIME - timeLeft) / TRAP_TIME) * 35;

  return (
    <div className="px-4 space-y-6 max-w-md mx-auto">
      <div className="fixed inset-0 pointer-events-none z-50 animate-pulse-danger" />

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
        <h1 className="font-headline text-headline-xl text-on-surface drop-shadow-md">
          Tidal Trap
        </h1>
        <div className="font-label text-label-md text-outline flex items-center gap-2">
          <span>SEQ OVERRIDE</span>
          <span className="w-1 h-1 rounded-full bg-outline" />
          <span>{challenge.index_label ?? "VAULT SECURE"}</span>
        </div>
      </div>

      {status === "sealed" ? (
        <div className="bg-surface-container-lowest border border-error/40 rounded-2xl p-6 space-y-4 text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-error/20 border border-error flex items-center justify-center shadow-[0_0_30px_rgba(255,180,171,0.3)]">
            <span className="material-symbols-outlined text-4xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
              water_lock
            </span>
          </div>
          <div>
            <h3 className="font-headline text-headline-lg-mobile text-error">BULKHEAD SEALED</h3>
            <p className="font-body text-body-md text-on-surface-variant mt-1">
              Hydraulic relays sequenced correctly. The flood is contained.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/scan" className="px-4 py-2 bg-error text-on-error font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-all">
              Scan Again
            </Link>
            <Link href="/dock" className="px-4 py-2 bg-surface-container-high text-on-surface font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-highest transition-all">
              Return to Dock
            </Link>
          </div>
        </div>
      ) : status === "breached" ? (
        <div className="bg-surface-container-lowest border border-error/50 rounded-2xl p-6 space-y-4 text-center animate-pulse-danger-soft">
          <div className="w-20 h-20 mx-auto rounded-full bg-error flex items-center justify-center shadow-[0_0_40px_rgba(255,0,10,0.5)]">
            <span className="material-symbols-outlined text-4xl text-on-error" style={{ fontVariationSettings: "'FILL' 1" }}>
              flood
            </span>
          </div>
          <div>
            <h3 className="font-headline text-headline-lg-mobile text-error glitch-text" data-text="SECTOR FLOODED">
              SECTOR FLOODED
            </h3>
            <p className="font-body text-body-md text-on-surface-variant mt-1">
              Relays not sequenced in time. The waters claim this ward.
            </p>
          </div>
          <button
            onClick={() => {
              setTimeLeft(TRAP_TIME);
              setSequence([]);
              setLit({});
              setStatus("running");
            }}
            className="w-full py-3 bg-error text-on-error font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-lg align-middle">refresh</span> Re-engage Relays
          </button>
        </div>
      ) : (
        <>
          {/* Timer */}
          <div className="flex justify-center">
            <div className={`glass-panel rounded-xl px-8 py-4 flex flex-col items-center ${timeLeft <= 10 ? "animate-pulse-danger-soft" : ""}`}>
              <span className="font-label text-label-sm text-error uppercase mb-1">
                Time Remaining
              </span>
              <span className={`font-headline text-6xl font-bold tracking-widest drop-shadow-[0_0_8px_rgba(255,180,171,0.5)] ${timeLeft <= 10 ? "text-error" : "text-on-surface"}`}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              <span className="font-label text-label-sm text-on-surface-variant mt-1 uppercase">
                {litCount}/{relays.length} relays lit
              </span>
            </div>
          </div>

          {/* Water visualization */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden glass-panel border-t-error p-1">
            <div className="absolute inset-1 rounded-xl overflow-hidden bg-surface-container-lowest">
              <div className="absolute bottom-0 left-0 right-0 bg-surface-container-high/80 backdrop-blur-sm border-t border-outline-variant transition-all duration-1000" style={{ height: `${waterPct}%` }}>
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-secondary/20 to-transparent" />
                <span className="material-symbols-outlined text-secondary/30 text-6xl absolute top-8 left-1/2 -translate-x-1/2">
                  water_drop
                </span>
              </div>

              <div className="absolute top-4 left-4 bg-surface/80 border border-outline-variant rounded px-2 py-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  speed
                </span>
                <span className="font-label text-label-sm text-error">{Math.round(waterPct)}% CAP</span>
              </div>
              <div className="absolute top-4 right-4 bg-surface/80 border border-outline-variant rounded px-2 py-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-sm">
                  thermostat
                </span>
                <span className="font-label text-label-sm text-primary-container">TEMP HI</span>
              </div>

              {sequence.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-surface/70 border border-outline-variant rounded px-2 py-1">
                  {sequence.map((id, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hydraulic relays */}
          <div className="glass-panel p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="font-headline text-headline-lg-mobile text-primary">HYDRAULIC RELAYS</span>
              <span className="font-label text-label-sm text-outline-variant">SEQ REQ</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {relays.map((relay) => {
                const isLit = lit[relay.id];
                return (
                  <button
                    key={relay.id}
                    disabled={status !== "running" || isLit}
                    onClick={() => activate(relay.id)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <span className={`font-label text-label-sm ${isLit ? "text-primary" : "text-outline-variant"}`}>
                      {relay.label}
                    </span>
                    <div className={`w-8 h-16 rounded-full relative shadow-inner border transition-all duration-300 ${
                      isLit
                        ? "bg-surface-container-low border-primary-container shadow-[0_0_10px_rgba(217,119,7,0.5)]"
                        : "bg-surface-container-low border-outline-variant group-hover:border-primary-container"
                    } ${errorFlash ? "animate-pulse-danger-soft" : ""}`}>
                      <div
                        className={`absolute left-1 right-1 h-7 rounded-full border transition-all duration-300 ${
                          isLit
                            ? "top-1 bg-primary-container border-primary-container shadow-[0_0_10px_rgba(217,119,7,0.6)]"
                            : "bottom-1 bg-surface-variant border-outline group-hover:bg-primary-container group-hover:border-primary-container"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="font-label text-label-sm text-on-surface-variant text-center uppercase tracking-widest">
              Engage the relays in the correct sequence before the pressure breaches.
            </p>
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
