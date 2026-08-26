import { type HTMLAttributes } from "react";

interface GearProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  spinning?: boolean;
  speed?: "slow" | "normal" | "fast";
}

export function Gear({
  size = "md",
  spinning = false,
  speed = "normal",
  className = "",
  ...props
}: GearProps) {
  const sizeStyles = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-32 h-32",
  };

  const speedStyles = {
    slow: "animate-[spin_8s_linear_infinite]",
    normal: "animate-[spin_4s_linear_infinite]",
    fast: "animate-[spin_2s_linear_infinite]",
  };

  return (
    <div
      className={`${sizeStyles[size]} ${spinning ? speedStyles[speed] : ""} ${className}`}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-primary-container">
        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64L19.43 12.97Z" />
      </svg>
    </div>
  );
}
