"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface UseCameraOptions {
  onScan?: (data: string) => void;
  onError?: (error: string) => void;
}

export function useCamera({ onScan, onError }: UseCameraOptions) {
  const [scanning, setScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const html5QrCodeRef = useRef<unknown>(null);
  const callbackRef = useRef({ onScan, onError });

  useEffect(() => {
    callbackRef.current = { onScan, onError };
  }, [onScan, onError]);

  const startScanning = useCallback(async (elementId: string) => {
    // Surface the viewfinder container before html5-qrcode sizes its decode
    // canvas. If it stays hidden (display:none), start() measures a 0x0
    // container and the decoder can never read frames — the camera would
    // preview but never detect a QR.
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (html5QrCodeRef.current) {
        try {
          await (html5QrCodeRef.current as { stop: () => Promise<void> }).stop();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(elementId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minDim * 0.7);
            return { width: size, height: size };
          },
        },
        (decodedText: string) => {
          callbackRef.current.onScan?.(decodedText);
        },
        () => {
          // ignore errors during scanning
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("NotAllowedError")) {
        callbackRef.current.onError?.(
          "Camera permission denied. Please enable camera access."
        );
        setHasCamera(false);
      } else {
        callbackRef.current.onError?.("Failed to start camera scanner.");
      }
      setScanning(false);
    }
  }, []);

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await (html5QrCodeRef.current as { stop: () => Promise<void> }).stop();
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  return {
    scanning,
    hasCamera,
    startScanning,
    stopScanning,
  };
}
