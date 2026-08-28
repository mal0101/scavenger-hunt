"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENTOR_NAV_ITEMS } from "@/lib/utils/navigation";

export default function MentorShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-dvh bg-surface flex">
      <aside className="hidden lg:flex flex-col w-64 bg-surface-container-low border-r border-outline-variant/30 fixed top-0 left-0 bottom-0 z-50 shadow-[2px_0_24px_rgba(217,119,7,0.08)]">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-outline-variant/30">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_12px_rgba(217,119,7,0.5)] animate-flicker-amber">
            <span
              className="material-symbols-outlined text-on-primary-container text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              compass_calibration
            </span>
          </div>
          <div>
            <p className="font-headline text-sm text-on-surface font-semibold">
              Aether Compass
            </p>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
              Mentor Panel
            </p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {MENTOR_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-label text-label-sm transition-all ${
                  active
                    ? "bg-primary-container/10 text-primary border border-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                <span className="uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-outline-variant/30">
          <Link
            href="/dock"
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              open_in_new
            </span>
            <span className="font-label text-label-sm uppercase">
              Player View
            </span>
          </Link>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-surface-container-high/95 backdrop-blur-md border-b border-primary-container/40 flex items-center justify-between px-4 shadow-[0_4px_20px_rgba(217,119,7,0.08)]">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-xl animate-flicker-amber"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            compass_calibration
          </span>
          <span className="font-headline text-sm text-on-surface">
            Mentor Panel
          </span>
        </div>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-high/95 backdrop-blur-md border-t border-primary-container/40 h-16 flex items-center justify-around px-2 shadow-[0_-8px_24px_rgba(217,119,7,0.06)]">
        {MENTOR_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-1.5 transition-all ${
                active
                  ? "text-primary"
                  : "text-on-surface-variant opacity-60 hover:opacity-100"
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                {item.icon}
              </span>
              <span className="font-label text-[10px] mt-0.5 uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
