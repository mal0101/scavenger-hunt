"use client";

import { type HTMLAttributes } from "react";

interface SteamToggleProps extends HTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function SteamToggle({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className = "",
  ...props
}: SteamToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`inline-flex items-center gap-3 group ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      {...props}
    >
      <div
        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
          checked
            ? "bg-primary-container shadow-[0_0_10px_rgba(217,119,7,0.3)]"
            : "bg-surface-container-highest border border-outline-variant"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${
            checked
              ? "left-7 bg-on-primary-container shadow-[0_0_5px_rgba(0,0,0,0.3)]"
              : "left-1 bg-on-surface-variant shadow-sm"
          }`}
        />
      </div>
      {label && (
        <span className="font-label text-label-sm text-on-surface-variant uppercase">
          {label}
        </span>
      )}
    </button>
  );
}
