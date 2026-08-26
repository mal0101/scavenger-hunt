"use client";

import { useCallback, useState } from "react";
import { useCamera } from "@/hooks/use-camera";
import { useQRStore } from "@/stores/qr-store";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const router = useRouter();
  const { showScanError, setShowScanError } = useQRStore();
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found">("idle");

  const handleScan = useCallback(
    (data: string) => {
      setScanStatus("found");
      // Navigate to scan result with encoded data
      router.push(`/scan-result?data=${encodeURIComponent(data)}`);
    },
    [router]
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
        {/* QR Reader element */}
        <div
          id="qr-reader"
          className={`absolute inset-0 ${scanning ? "z-10" : "hidden"}`}
        />

        {/* Placeholder when not scanning */}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {scanStatus === "found" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-4xl">
                    check_circle
                  </span>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-headline text-headline-lg-mobile text-primary">
                    QR Code Found!
                  </p>
                  <p className="font-body text-body-md text-on-surface-variant">
                    Processing scan result...
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
                    Point your camera at a QR checkpoint marker
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Gauge overlay when scanning */}
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

      {/* Action Button */}
      <button
        onClick={toggleScanning}
        disabled={!hasCamera}
        className="w-full py-4 rounded-xl bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-lg">
          {scanning ? "stop" : "qr_code_scanner"}
        </span>
        {scanning ? "Stop Scanning" : hasCamera ? "Start Scanner" : "Camera Unavailable"}
      </button>

      {/* Recent scans */}
      <div className="space-y-3">
        <h3 className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">
          Recent Scans
        </h3>
        <div className="bg-surface-container rounded-lg border border-outline-variant/30 p-4 text-center">
          <p className="font-body text-body-md text-on-surface-variant">
            No scans yet in this round.
          </p>
        </div>
      </div>
    </div>
  );
}
