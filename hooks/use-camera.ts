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

    const mediaDevices =
      typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    const hasGetUserMedia =
      mediaDevices && typeof mediaDevices.getUserMedia === "function";
    const hasEnumerate =
      mediaDevices && typeof mediaDevices.enumerateDevices === "function";

    // Deterministic no-camera detection (surface it before html5-qrcode
    // wraps the low-level error, whose name/message varies across browsers).
    const cameraAbsent = async (): Promise<boolean> => {
      if (!hasGetUserMedia) return true;
      if (hasEnumerate) {
        try {
          const devices = await mediaDevices!.enumerateDevices();
          return !devices.some((d) => d.kind === "videoinput");
        } catch {
          return false;
        }
      }
      return false;
    };

    try {
      if (await cameraAbsent()) {
        callbackRef.current.onError?.("Camera not available on this device.");
        setHasCamera(false);
        setScanning(false);
        return;
      }

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
          // ignore errors during scanning (fires on every undecoded frame)
        }
      );
    } catch (err: unknown) {
      const sender = err as Error & { name?: string };
      const name = typeof sender.name === "string" ? sender.name : "";
      const message =
        sender instanceof Error ? sender.message : String(err);
      if (
        name === "NotAllowedError" ||
        message.includes("NotAllowedError") ||
        message.includes("Permission denied")
      ) {
        callbackRef.current.onError?.(
          "Camera permission denied. Please enable camera access."
        );
        setHasCamera(false);
      } else if (
        name === "NotFoundError" ||
        name === "NotSupportedError" ||
        name === "TypeError" ||
        message.includes("NotFoundError") ||
        message.includes("NotSupportedError") ||
        message.includes("Not supported") ||
        message.includes("Cannot read properties of undefined") ||
        /not found|no camera|no available|unavailable|deviceId mismatch/i.test(
          message
        )
      ) {
        callbackRef.current.onError?.(
          "Camera not available on this device."
        );
        setHasCamera(false);
      } else if (await cameraAbsent()) {
        callbackRef.current.onError?.(
          "Camera not available on this device."
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
