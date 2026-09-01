"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const CIPHER = "TUBOF";
const SOLUTION = "STEAM";
const SYMBOLS = ["water_drop", "thermostat", "speed", "waves", "gas_meter", "bolt"];

function EnigmaContent() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  let challenge: {
    index_label?: string;
    points_earned?: number;
    team_total?: number;
  } = {};
  if (data) {
    try {
      challenge = JSON.parse(decodeURIComponent(data));
    } catch {
      // static
    }
  }

  const [rotation, setRotation] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);

  const decoded = useMemo(() => {
    return CIPHER.split("")
      .map((ch) => {
        const code = ((ch.charCodeAt(0) - 65 - rotation) % 26 + 26) % 26;
        return String.fromCharCode(65 + code);
      })
      .join("");
  }, [rotation]);

  const rotate = (dir: -1 | 1) => {
    setRotation((r) => (r + dir + 26) % 26);
    setWrong(false);
  };

  const lockIn = () => {
    setAttempts((a) => a + 1);
    if (decoded === SOLUTION) {
      setSolved(true);
    } else {
      setWrong(true);
    }
  };

  const ringSymbols = useMemo(() => {
    const arr: Array<number> = [];
    for (let i = 0; i < 12; i++) arr.push((i + rotation) % 12);
    return arr;
  }, [rotation]);

  return (
    <div className="px-4 space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-1 mt-2">
        <h2 className="font-headline text-headline-lg-mobile text-primary etched-text">
          PRESSURE VAULT
        </h2>
        <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
          {challenge.index_label ?? "Alignment Required"}
        </p>
      </div>

      {solved ? (
        <div className="bg-surface-container-lowest border border-primary-container/40 rounded-2xl p-6 space-y-4 text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_30px_rgba(217,119,7,0.5)]">
            <span className="material-symbols-outlined text-4xl text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <div>
            <h3 className="font-headline text-headline-lg-mobile text-primary">
              MANIFOLD UNLOCKED
            </h3>
            <p className="font-body text-body-md text-on-surface-variant mt-1">
              The cylinder deciphers to <span className="font-label text-label-sm text-primary font-bold">{SOLUTION}</span>. Pressure equalized.
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
          {/* Rotating cylinder */}
          <div className="flex justify-center">
            <div className="relative w-72 h-72">
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full bg-surface-container-low border-2 border-primary-container/60 flex items-center justify-center amber-glow-lg transition-transform duration-700"
                style={{ transform: `rotate(${rotation * 30}deg)` }}
              >
                {ringSymbols.map((sym, i) => {
                  const angle = (Math.PI / 180) * (i * 30 - 90);
                  const x = 50 + 44 * Math.cos(angle);
                  const y = 50 + 44 * Math.sin(angle);
                  return (
                    <span
                      key={i}
                      className="absolute text-primary/80 text-lg material-symbols-outlined"
                      style={{
                        left: `calc(${x}% - 12px)`,
                        top: `calc(${y}% - 12px)`,
                        transform: `rotate(${-rotation * 30}deg)`,
                      }}
                    >
                      {SYMBOLS[sym % SYMBOLS.length]}
                    </span>
                  );
                })}
              </div>

              {/* Central readout */}
              <div className="absolute inset-8 rounded-full bg-surface-bright/10 border-2 border-primary-container/40 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full brass-glow pointer-events-none" />
                <div className="text-center">
                  <span className="block font-label text-label-sm text-primary uppercase tracking-widest mb-1">
                    Readout
                  </span>
                  <span
                    className={`font-headline text-3xl tracking-[0.3em] font-bold ${
                      decoded === SOLUTION ? "text-primary" : "text-on-surface"
                    }`}
                  >
                    {decoded}
                  </span>
                </div>
              </div>

              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-5 bg-error shadow-[0_0_8px_rgba(255,180,171,0.8)]" />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => rotate(-1)}
              className="w-14 h-14 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center hover:border-primary-container hover:text-primary hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all"
              aria-label="Rotate counter-clockwise"
            >
              <span className="material-symbols-outlined text-2xl">rotate_left</span>
            </button>
            <div className="text-center min-w-24">
              <span className="font-label text-label-sm text-on-surface-variant uppercase">
                Shift
              </span>
              <span className="block font-headline text-2xl text-primary font-bold">
                {rotation}
              </span>
            </div>
            <button
              onClick={() => rotate(1)}
              className="w-14 h-14 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center hover:border-primary-container hover:text-primary hover:shadow-[0_0_15px_rgba(217,119,7,0.3)] transition-all"
              aria-label="Rotate clockwise"
            >
              <span className="material-symbols-outlined text-2xl">rotate_right</span>
            </button>
          </div>

          <div className="glass-panel arch-top rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">
                sensors
              </span>
              <div>
                <p className="font-label text-label-sm text-primary">
                  SENSOR READOUT
                </p>
                <p className="font-body text-body-md text-on-surface-variant">
                  Decipher the passphrase by rotating the cylinder. Align the
                  correct shift so the readout spells the answer.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border-t-2 border-primary-container border-x border-b border-outline-variant rounded-xl p-5 space-y-3">
            <h3 className="font-headline text-headline-lg-mobile text-primary border-b border-outline-variant pb-2 inline-block">
              The Mariner&apos;s Log
            </h3>
            <div className="font-body text-body-lg text-on-surface-variant space-y-3 italic">
              <p>
                Where the white walls meet the surging tide,
                <br />
                And ancient brass holds steam inside.
              </p>
              <p>
                Seek the gauge that measures naught but heat,
                <br />
                Beneath the shadow of the minaret&apos;s seat.
              </p>
            </div>
          </div>

          {wrong && (
            <div className="bg-error-container/20 border border-error/40 rounded-lg p-4 flex items-center gap-3 animate-pulse-danger-soft">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="font-body text-body-md text-on-surface">
                Pressures misaligned. Re-route the cylinder and try again.
              </p>
            </div>
          )}

          <button
            onClick={lockIn}
            className="w-full py-4 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">vpn_key</span>
            Verify Alignment ({attempts} attempt{attempts === 1 ? "" : "s"})
          </button>
        </>
      )}
    </div>
  );
}

export default function EnigmaPage() {
  return (
    <Suspense fallback={<div className="px-4 max-w-md mx-auto pt-8" />}>
      <EnigmaContent />
    </Suspense>
  );
}
