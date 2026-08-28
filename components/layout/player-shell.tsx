"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLAYER_NAV_ITEMS } from "@/lib/utils/navigation";

export default function PlayerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-dvh bg-surface relative">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-high/95 backdrop-blur-md border-b-2 border-primary-container/50 flex items-center justify-between px-4 shadow-[0_4px_20px_rgba(217,119,7,0.1)]">
        <Link href="/dock" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_12px_rgba(217,119,7,0.5)] group-hover:shadow-[0_0_18px_rgba(217,119,7,0.8)] transition-all animate-flicker-amber">
            <span
              className="material-symbols-outlined text-on-primary-container text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              compass_calibration
            </span>
          </div>
          <span className="font-headline text-sm text-on-surface hidden sm:inline">
            Aether Compass
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">leaderboard</span>
          </Link>
          <Link
            href="/scan"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-container/20 border border-primary/50 rounded-full hover:bg-primary hover:text-on-primary-container transition-all text-primary shadow-[0_0_10px_rgba(217,119,7,0.2)]"
          >
            <span className="material-symbols-outlined text-lg">
              qr_code_scanner
            </span>
            <span className="font-label text-label-sm font-bold uppercase hidden sm:inline">
              Scan
            </span>
          </Link>
        </div>
      </header>

      <main className="pt-16 pb-24 min-h-dvh">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-high/95 backdrop-blur-md border-t-2 border-primary-container/50 h-20 flex items-center justify-around px-2 safe-area-bottom shadow-[0_-8px_24px_rgba(217,119,7,0.08)]">
        {PLAYER_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const isScan = item.href === "/scan";

          if (isScan) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(217,119,7,0.6)] border-4 border-surface-container-high animate-flicker-amber">
                  <span className="material-symbols-outlined text-on-primary-container text-2xl">
                    {item.icon}
                  </span>
                </div>
                <span className="font-label text-label-sm text-primary mt-1 font-bold">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 transition-all ${
                active
                  ? "text-primary"
                  : "text-on-surface-variant opacity-60 hover:opacity-100"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {item.icon}
              </span>
              <span className="font-label text-label-sm mt-1">{item.label}</span>
              {active && (
                <div className="w-6 h-0.5 rounded-full bg-primary mt-1 shadow-[0_0_6px_rgba(255,183,125,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
