"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { apiFetch } from "@/lib/api-client";

const PHONE_PREFIX = "+212";
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dock";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullPhoneNumber = PHONE_PREFIX + phoneNumber;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();

    if (!PHONE_REGEX.test(fullPhoneNumber)) {
      setError("Enter a valid phone number (digits only).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const j = await apiFetch<{ success: boolean; message?: string }>("/api/v1/auth/send-otp", {
        method: "POST",
        body: { phone_number: fullPhoneNumber },
      });

      if (!j.success) {
        setError(j.message || "Failed to send OTP");
        return;
      }

      router.push(
        `/verify?phone=${encodeURIComponent(fullPhoneNumber)}&redirect=${encodeURIComponent(redirect)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-primary-container border-4 border-secondary-container flex items-center justify-center shadow-[0_0_30px_rgba(217,119,7,0.3)]">
          <span
            className="material-symbols-outlined text-on-primary-container text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            compass_calibration
          </span>
        </div>
        <div className="text-center">
          <h1 className="font-headline text-headline-lg-mobile text-on-surface">
            Aether Compass
          </h1>
          <p className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">
            Scavenger Hunt Platform
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="glass-panel arch-top rounded-xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-headline text-headline-lg-mobile text-on-surface">
            Begin Descent
          </h2>
          <p className="font-body text-body-md text-on-surface-variant">
            Enter your phone number to receive a verification code
          </p>
        </div>

        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="font-label text-label-sm text-primary uppercase tracking-widest block"
            >
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-xl">
                phone
              </span>
              <div className="w-full pl-12 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg font-label text-body-md text-on-surface focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all flex items-center gap-0">
                <span className="text-on-surface select-none whitespace-nowrap">{PHONE_PREFIX}</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="6XX XXX XXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  required
                  className="flex-1 min-w-0 outline-none bg-transparent placeholder:text-outline text-on-surface"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-error-container/20 border border-error/30 rounded-lg p-3">
              <p className="font-label text-label-sm text-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !phoneNumber}
            className="w-full py-3 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">
                  progress_activity
                </span>
                Transmitting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">
                  send
                </span>
                Send Verification Code
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-center font-label text-label-sm text-outline">
        ENSAM Casablanca — Kick-Off Week 2026
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">
            progress_activity
          </span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
