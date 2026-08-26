import { type HTMLAttributes, forwardRef } from "react";

interface SteamCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  arch?: boolean;
}

const SteamCard = forwardRef<HTMLDivElement, SteamCardProps>(
  (
    {
      variant = "default",
      padding = "md",
      arch = false,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: "bg-surface-container border border-outline-variant/30",
      glass: "glass-panel",
      elevated:
        "bg-surface-container border border-outline-variant/30 shadow-lg shadow-surface/20",
      outlined: "border border-outline-variant/50 bg-transparent",
    };

    const paddingStyles = {
      none: "",
      sm: "p-3",
      md: "p-5",
      lg: "p-8",
    };

    return (
      <div
        ref={ref}
        className={`${variantStyles[variant]} ${paddingStyles[padding]} rounded-xl ${arch ? "arch-top" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SteamCard.displayName = "SteamCard";

export { SteamCard, type SteamCardProps };
