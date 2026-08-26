import { type HTMLAttributes } from "react";

interface GaugeProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "error" | "secondary";
  showValue?: boolean;
}

export function Gauge({
  value,
  max = 100,
  label,
  size = "md",
  color = "primary",
  showValue = true,
  className = "",
  ...props
}: GaugeProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeStyles = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const colorStyles = {
    primary: "text-primary",
    error: "text-error",
    secondary: "text-secondary",
  };

  const bgStyles = {
    primary: "stroke-primary-container/30",
    error: "stroke-error-container/30",
    secondary: "stroke-secondary-container/30",
  };

  const fillStyles = {
    primary: "stroke-primary",
    error: "stroke-error",
    secondary: "stroke-secondary",
  };

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={`relative inline-flex flex-col items-center gap-1 ${className}`}
      {...props}
    >
      <div className={`${sizeStyles[size]} relative`}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            className={bgStyles[color]}
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${fillStyles[color]} transition-all duration-500`}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`font-headline text-lg font-bold ${colorStyles[color]}`}
            >
              {value}
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="font-label text-label-sm text-on-surface-variant uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
