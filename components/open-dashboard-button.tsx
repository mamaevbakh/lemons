"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OpenDashboardButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/dashboard", {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to get dashboard link");
      }

      const { url } = (await res.json()) as { url?: string };
      if (!url) {
        throw new Error("Dashboard URL missing in response");
      }

      window.open(url, "_blank");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={isLoading} variant="outline">
        <ExternalLink className="mr-2 h-4 w-4" />
        {isLoading ? "Opening..." : "Open Stripe Dashboard"}
      </Button>
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
