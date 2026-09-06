"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dock";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setError(
        "Enter your callsign or phone number (at least 3 characters)."
      );
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      // Plain fetch, not apiFetch: a 401 here is an *expected* login failure
      // that must surface the friendly error, not trigger the token-refresh
      // path (which would try to reload /login and wipe the message).
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });

      const body = (await res.json()) as {
        success: boolean;
        message: string;
        data?: { user?: { role?: string } };
      };

      if (!res.ok || !body.success || !body.data?.user) {
        setError(body.message || "Invalid username or phone number or password.");
        return;
      }

      const role = body.data.user.role;
      router.push(role === "MENTOR" ? "/mentor/dashboard" : redirect);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to sign in. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-8 border border-outline-variant/40 shadow-xl">
      <div className="mb-6 text-center">
        <span className="material-symbols-outlined text-primary text-5xl animate-flicker-amber inline-block">
          explore
        </span>
        <h1 className="font-headline text-headline-xl text-on-surface mt-3">
          Aether Compass
        </h1>
        <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest mt-2">
          Begin Descent
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest"
          >
            Username or Phone
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Callsign or +2126XX XXX XXX"
            className="mt-1 w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 font-body text-body-md text-on-surface focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 font-body text-body-md text-on-surface focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="bg-error-container/20 border border-error/40 text-error font-body text-body-sm rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-primary rounded-lg font-label text-label-md font-bold uppercase tracking-widest text-on-primary hover:bg-primary-container hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(217,119,7,0.25)]"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="font-label text-label-sm text-on-surface-variant text-center mt-6">
        ENSAM Casablanca — Kick-Off Week 2026
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}