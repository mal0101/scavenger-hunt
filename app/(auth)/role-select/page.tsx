"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { MeResponse } from "@/lib/types/api-responses";

export default function RoleSelectPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MeResponse>("/api/v1/auth/me")
      .then((j) => {
        if (j.success && j.data?.user?.role) {
          const userRole = j.data.user.role;
          setRole(userRole);
          if (userRole === "MENTOR") {
            router.replace("/mentor/dashboard");
          } else if (userRole === "PLAYER") {
            router.replace("/dock");
          }
        }
      })
      .catch(() => {
        // Not authenticated — show role selection
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_30px_rgba(217,119,7,0.3)]">
          <span
            className="material-symbols-outlined text-on-primary-container text-3xl animate-flicker-amber"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            compass_calibration
          </span>
        </div>
      </div>
    );
  }

  const isPlayer = role === "PLAYER";
  const isMentor = role === "MENTOR";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 space-y-8">
      {/* Compass Icon */}
      <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center shadow-[0_0_30px_rgba(217,119,7,0.3)]">
        <span
          className="material-symbols-outlined text-on-primary-container text-4xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          compass_calibration
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="font-headline text-headline-xl text-on-surface">
          Choose Your Path
        </h1>
        <p className="font-body text-body-lg text-on-surface-variant max-w-xs mx-auto">
          How will you navigate the Gadz&apos;arts Compass?
        </p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-sm space-y-4">
        {/* Player Option */}
        <Link href="/dock" className={`block group ${isMentor ? "pointer-events-none opacity-40" : ""}`} aria-disabled={isMentor}>
          <div className="glass-panel arch-top rounded-xl p-6 border-t-primary-container hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-container/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary-container/30 transition-colors">
                <span className="material-symbols-outlined text-primary text-2xl">
                  adventure
                </span>
              </div>
              <div>
                <h2 className="font-headline text-lg text-on-surface group-hover:text-primary transition-colors">
                  Player
                </h2>
                <p className="font-body text-sm text-on-surface-variant">
                  {isMentor ? "Not available for your account" : "Join the hunt, scan QR codes, earn points"}
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Mentor Option */}
        <Link href="/mentor/dashboard" className={`block group ${isPlayer ? "pointer-events-none opacity-40" : ""}`} aria-disabled={isPlayer}>
          <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30 hover:border-primary/30 hover:scale-[1.02] transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-secondary-container/20 border border-secondary/30 flex items-center justify-center group-hover:bg-secondary-container/30 transition-colors">
                <span className="material-symbols-outlined text-secondary text-2xl">
                  school
                </span>
              </div>
              <div>
                <h2 className="font-headline text-lg text-on-surface group-hover:text-secondary transition-colors">
                  Mentor
                </h2>
                <p className="font-body text-sm text-on-surface-variant">
                  {isPlayer ? "Not available for your account" : "Manage games, monitor teams, control rounds"}
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <p className="font-label text-xs text-on-surface-variant/50 text-center">
        Your role is determined by your account. Contact a mentor if you need access to the operations console.
      </p>
    </div>
  );
}
