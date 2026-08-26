import { type HTMLAttributes } from "react";

interface PortholeProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "active" | "danger";
  children?: React.ReactNode;
}

export function Porthole({
  size = "md",
  variant = "default",
  children,
  className = "",
  ...props
}: PortholeProps) {
  const sizeStyles = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const variantStyles = {
    default: "border-primary-container/30",
    active: "border-primary/50 shadow-[0_0_20px_rgba(217,119,7,0.3)]",
    danger: "border-error/50 shadow-[0_0_20px_rgba(255,180,171,0.3)]",
  };

  return (
    <div
      className={`relative ${sizeStyles[size]} rounded-full border-2 ${variantStyles[variant]} bg-surface flex items-center justify-center ${className}`}
      {...props}
    >
      <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-surface-container-highest border border-outline-variant/50 z-10" />
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-surface-container-highest border border-outline-variant/50 z-10" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-surface-container-highest border border-outline-variant/50 z-10" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-surface-container-highest border border-outline-variant/50 z-10" />
      {children}
    </div>
  );
}
