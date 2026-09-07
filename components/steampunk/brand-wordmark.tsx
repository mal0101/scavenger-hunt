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
      className={`${iconClasses} rounded-full bg-primary-container flex items-center justify-center ${glow} animate-flicker-amber`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        className="w-3/5 h-3/5 text-on-primary-container"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="24" cy="24" r="15" strokeWidth="2.5" />
        <polygon points="24,7 25,21 24,26 23,21" fill="currentColor" stroke="none" />
        <polygon points="7,24 21,23 26,24 21,25" fill="currentColor" stroke="none" />
        <polygon points="24,41 25,27 24,22 23,27" fill="currentColor" stroke="none" />
        <polygon points="41,24 27,25 22,24 27,23" fill="currentColor" stroke="none" />
        <circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none" />
      </svg>
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