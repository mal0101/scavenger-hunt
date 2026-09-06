"use client";

import Link from "next/link";

export default function RoleSelectPage() {
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
          How will you navigate the Aether Compass?
        </p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-sm space-y-4">
        {/* Player Option */}
        <Link href="/dock" className="block group">
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
                  Join the hunt, scan QR codes, earn points
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Mentor Option */}
        <Link href="/mentor/dashboard" className="block group">
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
                  Manage games, monitor teams, control rounds
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
