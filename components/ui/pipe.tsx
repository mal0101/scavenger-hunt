import { type HTMLAttributes } from "react";

interface PipeProps extends HTMLAttributes<HTMLDivElement> {
  direction?: "horizontal" | "vertical";
  length?: "sm" | "md" | "lg" | "full";
  hasFluid?: boolean;
  fluidColor?: "primary" | "error" | "secondary";
}

export function Pipe({
  direction = "horizontal",
  length = "md",
  hasFluid = false,
  fluidColor = "primary",
  className = "",
  ...props
}: PipeProps) {
  const lengthStyles = {
    horizontal: {
      sm: "w-16 h-3",
      md: "w-32 h-3",
      lg: "w-48 h-3",
      full: "w-full h-3",
    },
    vertical: {
      sm: "h-16 w-3",
      md: "h-32 w-3",
      lg: "h-48 w-3",
      full: "h-full w-3",
    },
  };

  const fluidStyles = {
    primary: "bg-primary",
    error: "bg-error",
    secondary: "bg-secondary",
  };

  return (
    <div
      className={`relative bg-surface-container-highest border border-outline-variant/50 rounded-sm ${lengthStyles[direction][length]} ${className}`}
      {...props}
    >
      {hasFluid && (
        <div
          className={`absolute ${direction === "horizontal" ? "left-0 top-0 bottom-0 w-3/4" : "top-0 left-0 right-0 h-3/4"} ${fluidStyles[fluidColor]} rounded-sm opacity-80`}
        />
      )}
      {/* Rivets */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-surface-container border border-outline-variant/50" />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-surface-container border border-outline-variant/50" />
    </div>
  );
}
