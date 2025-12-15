"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ConnectStripeButtonProps = {
  hasAccountId: boolean;
};

export function ConnectStripeButton({ hasAccountId }: ConnectStripeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to start Stripe onboarding");
      }

      const { url } = (await res.json()) as { url?: string };
      if (!url) {
        throw new Error("Stripe onboarding URL missing in response");
      }

      window.location.href = url;
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading
          ? "Redirecting..."
          : hasAccountId
            ? "Continue Stripe onboarding"
            : "Connect Stripe"}
      </Button>
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
