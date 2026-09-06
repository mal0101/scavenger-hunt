"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Toast } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const setHydrated = useUIStore((s) => s.setHydrated);

  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Service worker support is best-effort.
        });
      });
    }
  }, []);

  return (
    <>
      {children}
      <Toast />
    </>
  );
}
