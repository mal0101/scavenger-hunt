"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  team_id: string;
  name: string;
  score: number;
  eliminated: boolean;
  member_count?: number;
}

interface UseLeaderboardOptions {
  gameId: string;
  enabled?: boolean;
  onLeaderboardUpdate?: (teams: LeaderboardEntry[]) => void;
}

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

export function useLeaderboard({
  gameId,
  enabled = true,
  onLeaderboardUpdate,
}: UseLeaderboardOptions) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbackRef = useRef(onLeaderboardUpdate);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);

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
          if (!cancelled) {
            setConnected(true);
            setReconnecting(false);
            backoffRef.current = INITIAL_BACKOFF_MS;
          }
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
          if (cancelled) return;
          setConnected(false);
          es.close();
          setReconnecting(true);
          const delay = backoffRef.current;
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
          setTimeout(connect, delay);
        };
      } catch {
        if (!cancelled) {
          setReconnecting(true);
          const delay = backoffRef.current;
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
          setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [gameId, enabled, disconnect]);

  return { connected, reconnecting, teams, disconnect };
}
