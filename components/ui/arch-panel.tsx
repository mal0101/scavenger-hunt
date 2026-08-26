import { type HTMLAttributes } from "react";

interface ArchPanelProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function ArchPanel({ children, className = "", ...props }: ArchPanelProps) {
  return (
    <div
      className={`glass-panel arch-top rounded-t-[40px] rounded-b-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
