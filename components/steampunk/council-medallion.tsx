export function CouncilMedallion({
  size = 72,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-full overflow-hidden border-2 border-primary-container bg-surface shadow-[0_0_24px_rgba(217,119,7,0.35)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/ade_logo_medallion.webp"
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}