"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");

  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMagicLinkSent(false);

    try {
      const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(
        safeNext ?? "/dashboard",
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Something went wrong";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const title = "Sign in";
  const buttonLabel = "Send magic link";

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
            We’ll email you a link to sign in.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {magicLinkSent ? (
            <p className="text-sm text-muted-foreground">
              Check your email for the magic link.
            </p>
          ) : null}

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Please wait..." : buttonLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}