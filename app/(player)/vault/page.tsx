"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface PlayerData {
  id: string;
  nickname: string | null;
  total_score: number;
  team: {
    id: string;
    name: string;
    invite_code: string;
    total_score: number;
    eliminated?: boolean;
  } | null;
}

export default function VaultPage() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ success: boolean; data: PlayerData }>("/api/v1/players/me")
      .then((j) => {
        if (j.success) setPlayer(j.data);
      })
      .catch((err) => console.error("Vault load error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 space-y-6 max-w-lg mx-auto">
      <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden mt-2">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-64 h-64 border border-primary-container rounded-full border-dashed animate-gear-spin" />
          <div className="absolute w-48 h-48 border border-primary rounded-full" />
        </div>

        <p className="font-label text-label-sm uppercase text-primary-container absolute top-4 left-4 z-10">
          Team Vault
        </p>

        <div className="relative z-10 w-40 h-40 rounded-full bg-primary-container border-4 border-secondary-container flex items-center justify-center shadow-[0_0_30px_rgba(217,119,7,0.2)]">
          <span className="material-symbols-outlined text-[80px] text-primary-fixed-dim drop-shadow-[0_0_10px]">
            {player?.team ? "group" : "person_add"}
          </span>
        </div>

        <div className="mt-6 text-center z-10">
          <p className="font-headline text-lg text-on-surface">
            {loading ? "Loading..." : player?.team ? player.team.name : "No Team"}
          </p>
          <p className="font-label text-label-sm text-on-surface-variant mt-1">
            {player?.total_score ?? 0} pts
          </p>
        </div>
      </div>

      <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-5 space-y-3">
        <h3 className="font-label text-label-sm uppercase text-on-surface-variant tracking-widest">
          Team Status
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-body text-body-md text-on-surface-variant">
              Team Name
            </span>
            <span className="font-headline text-sm text-on-surface">
              {loading ? "..." : player?.team?.name ?? "Not in a team"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-body text-body-md text-on-surface-variant">
              Invite Code
            </span>
            <span className="font-label text-label-sm text-primary bg-primary-container/10 px-2 py-0.5 rounded">
              {loading ? "------" : player?.team?.invite_code ?? "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-body text-body-md text-on-surface-variant">
              Total Score
            </span>
            <span className="font-headline text-lg text-primary font-bold">
              {player?.team?.total_score ?? 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-body text-body-md text-on-surface-variant">
              Status
            </span>
            <span
              className={`font-label text-label-sm font-bold uppercase ${
                player?.team?.eliminated ? "text-error" : "text-primary"
              }`}
            >
              {player?.team
                ? player.team.eliminated
                  ? "Eliminated"
                  : "Active"
                : "No Team"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
