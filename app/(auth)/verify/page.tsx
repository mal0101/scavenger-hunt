"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { apiFetch } from "@/lib/api-client";

const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const redirect = searchParams.get("redirect") || "/dock";
  const missingPhone = !PHONE_REGEX.test(phone);

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^[0-9]*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = pasted.split("").concat(Array(6 - pasted.length).fill(""));
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (missingPhone) {
      setError("Phone number is missing. Go back and request a new code.");
      return;
    }

    const code = digits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<{ success: boolean; message?: string; data?: { user?: { role?: string } } }>("/api/v1/auth/verify-otp", {
        method: "POST",
        body: { phone_number: phone, code },
      });

      if (!data.success) {
        setError(data.message || "Invalid verification code");
        return;
      }

      const userRole = data.data?.user?.role;

      if (userRole === "MENTOR") {
        router.push("/mentor/dashboard");
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<{ success: boolean; message?: string }>("/api/v1/auth/send-otp", {
        method: "POST",
        body: { phone_number: phone },
      });

      if (!data.success) {
        setError(data.message || "Failed to resend OTP");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={() => router.push("/login")}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-xl">arrow_back</span>
        <span className="font-label text-label-sm uppercase">Change Number</span>
      </button>

      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary-container border-2 border-secondary-container flex items-center justify-center">
          <span
            className="material-symbols-outlined text-on-primary-container text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            pin
          </span>
        </div>
        <div className="text-center">
          <h1 className="font-headline text-headline-lg-mobile text-on-surface">
            Verification
          </h1>
          <p className="font-body text-body-md text-on-surface-variant mt-1">
            Code sent to {phone}
          </p>
        </div>
      </div>

      <div className="glass-panel arch-top rounded-xl p-8 space-y-6">
        <form onSubmit={handleVerify} className="space-y-6">
          {/* OTP Input */}
          <div className="flex justify-center gap-3">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                aria-label={`OTP digit ${i + 1} of 6`}
                aria-invalid={!!error}
                className="w-12 h-14 text-center font-label text-headline-lg-mobile text-on-surface bg-surface-container-low border-2 border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
            ))}
          </div>

          {error && (
            <div role="alert" className="bg-error-container/20 border border-error/30 rounded-lg p-3">
              <p className="font-label text-label-sm text-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || digits.some((d) => !d)}
            aria-busy={loading}
            className="w-full py-3 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={handleResend}
            disabled={loading}
            className="font-label text-label-sm text-primary hover:text-primary-container transition-colors underline underline-offset-4"
          >
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
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
      <VerifyForm />
    </Suspense>
  );
}
