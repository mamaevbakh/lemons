"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type StripeStatusRefreshProps = {
  disabled?: boolean;
};

export function StripeStatusRefresh({ disabled }: StripeStatusRefreshProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/connect/status", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to refresh Stripe status");
      }

      // Reload to reflect server-rendered status badge/state.
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        onClick={onClick}
        disabled={disabled || isLoading}
      >
        {isLoading ? "Refreshing..." : "Refresh status"}
      </Button>
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
