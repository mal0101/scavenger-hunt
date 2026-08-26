import { forwardRef, type ButtonHTMLAttributes } from "react";

interface SteamButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: string;
}

const SteamButton = forwardRef<HTMLButtonElement, SteamButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-label font-bold uppercase tracking-widest transition-all duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
      primary:
        "bg-primary-container text-on-primary-container hover:shadow-[0_0_15px_rgba(217,119,7,0.4)] active:bg-primary-container/80",
      secondary:
        "bg-surface-container-high border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest active:bg-surface-container",
      danger:
        "bg-error-container/20 border border-error/30 text-error hover:bg-error/10 active:bg-error/20",
      ghost:
        "bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:bg-surface-container-high",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-label-sm",
      md: "px-4 py-2.5 text-label-sm",
      lg: "px-6 py-4 text-label-md",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="material-symbols-outlined text-lg animate-spin">
            progress_activity
          </span>
        ) : icon ? (
          <span className="material-symbols-outlined text-lg">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

SteamButton.displayName = "SteamButton";

export { SteamButton, type SteamButtonProps };
