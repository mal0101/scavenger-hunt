"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center justify-center px-5">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-error-container border-4 border-error flex items-center justify-center">
            <span
              className="material-symbols-outlined text-on-error-container text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-headline text-headline-lg text-on-surface">
            System Malfunction
          </h1>
          <p className="font-label text-label-md text-on-surface-variant uppercase tracking-wider">
            Critical pressure anomaly detected
          </p>
        </div>

        <div className="glass-panel rounded-xl p-6 space-y-4">
          <p className="font-body text-body-md text-on-surface-variant">
            The hydraulic subsystem has encountered an unexpected error. Manual
            intervention is required to restore operations.
          </p>
          {error.digest && (
            <p className="font-label text-label-sm text-outline">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-6 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all"
          >
            Retry
          </button>
          <button
            onClick={() => router.push("/dock")}
            className="flex-1 py-3 px-6 border border-outline-variant text-on-surface-variant font-label text-label-sm uppercase tracking-widest rounded-lg hover:bg-surface-container transition-all"
          >
            Return to Dock
          </button>
        </div>
      </div>
    </div>
  );
}
