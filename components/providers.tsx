"use client";

import { useEffect } from "react";
import { Toast } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
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
