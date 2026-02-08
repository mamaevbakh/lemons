"use client";

import { useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BillingActions() {
  const [isPending, startTransition] = useTransition();

  function openPortal() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/subscription/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    });
  }

  return (
    <Button variant="outline" onClick={openPortal} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="mr-2 h-4 w-4" />
      )}
      Manage billing
    </Button>
  );
}
