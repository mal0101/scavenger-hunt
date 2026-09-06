"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function Toast() {
  const { toastMessage, toastType, clearToast } = useUIStore();

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(clearToast, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  const typeStyles = {
    success: "border-primary/50 bg-primary-container/10 text-primary",
    error: "border-error/50 bg-error-container/10 text-error",
    info: "border-outline-variant bg-surface-container-high text-on-surface",
  };

  const typeIcons = {
    success: "check_circle",
    error: "error",
    info: "info",
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-toast-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg max-w-sm ${
          typeStyles[toastType]
        }`}
        role="status"
        aria-live="polite"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">{typeIcons[toastType]}</span>
        <p className="font-body text-sm flex-1">{toastMessage}</p>
        <button
          onClick={clearToast}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Dismiss notification"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  );
}
