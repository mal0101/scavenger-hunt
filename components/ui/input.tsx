import { forwardRef, type InputHTMLAttributes } from "react";

interface SteamInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: string;
  inputSize?: "sm" | "md" | "lg";
}

const SteamInput = forwardRef<HTMLInputElement, SteamInputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      inputSize = "md",
      className = "",
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: "px-3 py-2 text-body-md",
      md: "px-4 py-2.5 text-body-md",
      lg: "px-5 py-3 text-body-lg",
    };

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="font-label text-label-sm text-on-surface-variant uppercase block">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full bg-surface-container-low border rounded-lg font-body text-on-surface focus:outline-none focus:border-primary transition-colors ${
              icon ? "pl-10" : ""
            } ${
              error
                ? "border-error focus:border-error"
                : "border-outline-variant"
            } ${sizeStyles[inputSize]} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="font-label text-label-sm text-error">{error}</p>
        )}
        {hint && !error && (
          <p className="font-label text-label-sm text-on-surface-variant">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

SteamInput.displayName = "SteamInput";

export { SteamInput, type SteamInputProps };
