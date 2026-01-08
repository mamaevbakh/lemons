"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type PurchaseButtonProps = {
  offerSlug: string;
  packageId: string;
  packageName: string;
  isAuthenticated: boolean;
};

export function PurchaseButton({
  offerSlug,
  packageId,
  packageName,
  isAuthenticated,
}: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offerSlug,
          packageId,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to start checkout");
      }

      const url = body?.url as string | undefined;
      if (!url) throw new Error("Checkout URL missing");

      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        onClick={startCheckout}
        disabled={isLoading}
      >
        {isLoading ? "Redirecting..." : `Choose ${packageName}`}
      </Button>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {!isAuthenticated ? (
        <p className="text-xs text-muted-foreground">
          Guest checkout supported. Stripe will ask for your email at checkout.
        </p>
      ) : null}
    </div>
  );
}
