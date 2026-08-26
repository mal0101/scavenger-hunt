"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  team_id: string;
  name: string;
  score: number;
  eliminated: boolean;
}

interface UseLeaderboardOptions {
  gameId: string;
  enabled?: boolean;
  onLeaderboardUpdate?: (teams: LeaderboardEntry[]) => void;
}

export function useLeaderboard({
  gameId,
  enabled = true,
  onLeaderboardUpdate,
}: UseLeaderboardOptions) {
  const [connected, setConnected] = useState(false);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbackRef = useRef(onLeaderboardUpdate);

  useEffect(() => {
    callbackRef.current = onLeaderboardUpdate;
  }, [onLeaderboardUpdate]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled || !gameId) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const es = new EventSource(
          `/api/v1/sse/leaderboard/${gameId}`
        );
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!cancelled) setConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "leaderboard" && data.teams) {
              setTeams(data.teams);
              callbackRef.current?.(data.teams);
            }
          } catch {
            // ignore parse errors
          }
        };

        es.onerror = () => {
          if (!cancelled) setConnected(false);
          es.close();
          if (!cancelled) setTimeout(connect, 3000);
        };
      } catch {
        if (!cancelled) setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [gameId, enabled, disconnect]);

  return { connected, teams, disconnect };
}
