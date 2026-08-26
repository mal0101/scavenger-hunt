interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string;
  height?: string;
}

export function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "",
    rounded: "rounded-lg",
  };

  return (
    <div
      className={`skeleton ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

export function StatSkeleton() {
  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-4 space-y-2">
      <Skeleton variant="text" width="60%" height="12px" />
      <Skeleton variant="text" width="40%" height="28px" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-5 space-y-3">
      <Skeleton variant="text" width="70%" height="20px" />
      <Skeleton variant="text" width="100%" height="14px" />
      <Skeleton variant="text" width="80%" height="14px" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rounded" width="60px" height="28px" />
        <Skeleton variant="rounded" width="80px" height="28px" />
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 bg-surface-container rounded-lg border border-outline-variant/30"
        >
          <Skeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="60%" height="14px" />
            <Skeleton variant="text" width="30%" height="12px" />
          </div>
          <Skeleton variant="text" width="40px" height="20px" />
        </div>
      ))}
    </div>
  );
}

export function ScanSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton variant="rounded" className="w-full aspect-square" />
      <Skeleton variant="rounded" className="w-full h-14 rounded-xl" />
    </div>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-5 flex items-center gap-4">
      <Skeleton variant="circular" width="48px" height="48px" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="50%" height="16px" />
        <Skeleton variant="text" width="30%" height="12px" />
      </div>
      <Skeleton variant="text" width="50px" height="24px" />
    </div>
  );
}
