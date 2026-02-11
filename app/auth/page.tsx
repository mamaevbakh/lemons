"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const OTP_LENGTH = 6;
type AuthStep = "email" | "otp";

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<AuthStep>("email");
  const [hasSentEmail, setHasSentEmail] = useState(false);

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  function getSiteOrigin(): string {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    if (configured && configured.trim().length > 0) {
      let value = configured.trim();
      if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`;
      }
      try {
        return new URL(value).origin;
      } catch {
        // Fall through to runtime origin.
      }
    }

    return window.location.origin;
  }

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        if (data.user) {
          router.replace(safeNext ?? "/dashboard");
          return;
        }
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router, safeNext, supabase]);

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setIsSending(true);
    setError(null);

    try {
      const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(
        safeNext ?? "/dashboard",
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      setHasSentEmail(true);
      setStep("otp");
      setOtp("");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Something went wrong";
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  function handleResendFromStepOne() {
    setStep("email");
    setOtp("");
    setError(null);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifyingOtp(true);
    setError(null);

    try {
      const token = otp.trim();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) throw error;
      router.replace(safeNext ?? "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Something went wrong";
      setError(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  const title = "Sign in or create account";
  const buttonLabel = hasSentEmail ? "Resend link and code" : "Send link and code";

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center gap-3">
          <Spinner className="size-6" />
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email a magic link and a one-time code.
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setHasSentEmail(false);
                }}
                required
                disabled={isSending}
              />
            </div>

            {hasSentEmail ? (
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive it? Send another link and code.
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSending}>
              {isSending ? "Please wait..." : buttonLabel}
            </Button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to {email}.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                One-time code
              </label>
              <InputOTP
                id="otp"
                maxLength={OTP_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                autoComplete="one-time-code"
                value={otp}
                onChange={setOtp}
                disabled={isVerifyingOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifyingOtp || otp.trim().length !== OTP_LENGTH}
            >
              {isVerifyingOtp ? "Verifying..." : "Continue with code"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendFromStepOne}
              disabled={isVerifyingOtp}
            >
              Resend email
            </Button>
          </form>
        ) : null}

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
