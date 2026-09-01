"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

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
  const lastServerTimerRef = useRef<TimerData | null>(null);
  const localIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStateRef = useRef<TimerData | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    tickCallbackRef.current = onTick;
    expireCallbackRef.current = onExpire;
  }, [onTick, onExpire]);

  const pushTimer = useCallback((data: TimerData) => {
    timerStateRef.current = data;
    setTimer(data);
    tickCallbackRef.current?.(data);
    if (data.expired) {
      expireCallbackRef.current?.();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
      localIntervalRef.current = null;
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
              consecutiveErrorsRef.current = 0;
              const timerData: TimerData = {
                remaining: data.round.remaining,
                total: data.round.total,
                expired: data.round.expired,
                round_number: data.round.number,
                status: data.status,
              };
              lastServerTimerRef.current = timerData;
              pushTimer(timerData);
            }
          } catch {
            // ignore parse errors
          }
        };

        es.onerror = () => {
          if (cancelled) return;
          setConnected(false);
          es.close();
          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current >= 5) {
            if (localIntervalRef.current) {
              clearInterval(localIntervalRef.current);
              localIntervalRef.current = null;
            }
            router.replace("/login");
            return;
          }
          setTimeout(connect, 3000);
        };

        if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        localIntervalRef.current = setInterval(() => {
          const base = lastServerTimerRef.current;
          if (!base || base.expired || base.status !== "ACTIVE") return;
          const remaining = Math.max(0, base.remaining - 1);
          const data: TimerData = { ...base, remaining };
          if (remaining === 0 && !base.expired) {
            pushTimer({ ...data, expired: true });
          } else {
            pushTimer(data);
          }
        }, 1000);
      } catch {
        if (!cancelled) setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [gameId, enabled, disconnect, pushTimer, router]);

  return { connected, timer, disconnect };
}
