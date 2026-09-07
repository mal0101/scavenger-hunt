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

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

export function useTimer({
  gameId,
  enabled = true,
  onTick,
  onExpire,
}: UseTimerOptions) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [timer, setTimer] = useState<TimerData | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const tickCallbackRef = useRef(onTick);
  const expireCallbackRef = useRef(onExpire);
  const lastServerTimerRef = useRef<TimerData | null>(null);
  const localIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredHandledRef = useRef(false);
  const timerStateRef = useRef<TimerData | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);

  useEffect(() => {
    tickCallbackRef.current = onTick;
    expireCallbackRef.current = onExpire;
  }, [onTick, onExpire]);

  // Fire onExpire exactly once per expiry, even though every SSE resync and
  // local tick carries an expired snapshot. A fresh, un-expired timer (new
  // round) re-arms the guard so the next expiry is announced again.
  const pushTimer = useCallback((data: TimerData) => {
    timerStateRef.current = data;
    setTimer(data);
    tickCallbackRef.current?.(data);
    if (data.expired) {
      if (!expiredHandledRef.current) {
        expiredHandledRef.current = true;
        expireCallbackRef.current?.();
      }
    } else {
      expiredHandledRef.current = false;
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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
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
          if (!cancelled) {
            setConnected(true);
            setReconnecting(false);
            backoffRef.current = INITIAL_BACKOFF_MS;
          }
        };

        es.onmessage = (event) => {
          if (cancelled) return;
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
          setReconnecting(true);
          const delay = backoffRef.current;
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        localIntervalRef.current = setInterval(() => {
          const base = lastServerTimerRef.current;
          if (!base || base.expired || base.status !== "ACTIVE") return;
          const remaining = Math.max(0, base.remaining - 1);
          // Persist the decrement so the local countdown compounds every
          // second instead of re-reading the last server snapshot (which only
          // refreshes on the ~10s SSE resync). The next server push snaps the
          // value back to true wall-clock time if we ever drift.
          lastServerTimerRef.current = { ...base, remaining };
          const data: TimerData = { ...base, remaining };
          if (remaining === 0 && !base.expired) {
            pushTimer({ ...data, expired: true });
          } else {
            pushTimer(data);
          }
        }, 1000);
      } catch {
        if (!cancelled) {
          setReconnecting(true);
          const delay = backoffRef.current;
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [gameId, enabled, disconnect, pushTimer]);

  return { connected, reconnecting, timer, disconnect };
}
