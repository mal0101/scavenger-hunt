import Link from "next/link";

export function BrandBadge({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const iconClasses = {
    sm: "w-7 h-7 text-base",
    md: "w-8 h-8 text-lg",
    lg: "w-12 h-12 text-2xl",
  }[size];
  const glow = size === "lg" ? "shadow-[0_0_20px_rgba(217,119,7,0.6)]" : "shadow-[0_0_12px_rgba(217,119,7,0.5)]";

  return (
    <div
      className={`${iconClasses} rounded-full bg-primary-container flex items-center justify-center ${glow} animate-flicker-amber overflow-hidden`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/ade_logo_medallion.webp"
        alt=""
        width={48}
        height={48}
        draggable={false}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function BrandWordmark({
  size = "md",
  href = "/dock",
  caption,
  hideTextOnMobile = false,
}: {
  size?: "sm" | "md" | "lg";
  href?: string;
  caption?: string;
  hideTextOnMobile?: boolean;
}) {
  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-3xl",
  }[size];
  const textVisibility = hideTextOnMobile ? "hidden sm:inline" : "";

  return (
    <Link
      href={href}
      className="flex items-center gap-2 group"
      aria-label="Gadz'arts Compass home"
    >
      <BrandBadge size={size} />
      <span className="leading-tight">
        <span
          className={`font-headline ${textClasses} ${textVisibility} text-on-surface group-hover:text-primary transition-colors`}
        >
          Gadz&apos;arts Compass
        </span>
        {caption ? (
          <span className="block font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
            {caption}
          </span>
        ) : null}
      </span>
    </Link>
  );
}