"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface TimerData {
  remaining: number;
  total: number;
  expired: boolean;
  round_number: number;
  status: string;
}

interface UseTimerOptions {
  gameId: string;
  enabled?: boolean;
  onTick?: (data: TimerData) => void;
  onExpire?: () => void;
}

export function useTimer({
  gameId,
  enabled = true,
  onTick,
  onExpire,
}: UseTimerOptions) {
  const [connected, setConnected] = useState(false);
  const [timer, setTimer] = useState<TimerData | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const tickCallbackRef = useRef(onTick);
  const expireCallbackRef = useRef(onExpire);

  useEffect(() => {
    tickCallbackRef.current = onTick;
    expireCallbackRef.current = onExpire;
  }, [onTick, onExpire]);

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
        const es = new EventSource(`/api/v1/sse/timer/${gameId}`);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!cancelled) setConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "timer" && data.round) {
              const timerData: TimerData = {
                remaining: data.round.remaining,
                total: data.round.total,
                expired: data.round.expired,
                round_number: data.round.number,
                status: data.status,
              };
              setTimer(timerData);
              tickCallbackRef.current?.(timerData);

              if (timerData.expired) {
                expireCallbackRef.current?.();
              }
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

  return { connected, timer, disconnect };
}
