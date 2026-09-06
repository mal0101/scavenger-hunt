"use client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        refreshPromise = null;
      }, 500);
    }
  })();

  return refreshPromise;
}

export interface ApiClientOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { method = "GET", body, headers } = options;

  const doFetch = () =>
    fetch(url, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }

  if (!res.ok) {
    let message: string;
    try {
      const errBody = await res.json();
      message = errBody.message ?? errBody.error ?? `Request failed (${res.status})`;
    } catch {
      message = `Request failed with status ${res.status}`;
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}
