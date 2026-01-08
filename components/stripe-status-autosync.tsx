"use client";

import { useEffect, useState } from "react";

type StripeStatusAutosyncProps = {
  enabled: boolean;
};

export function StripeStatusAutosync({ enabled }: StripeStatusAutosyncProps) {
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (!enabled || hasRun) return;
    setHasRun(true);

    (async () => {
      await fetch("/api/stripe/connect/status", { method: "POST" }).catch(
        () => null,
      );

      // Reload page data (server component) after syncing
      window.location.replace("/dashboard/payouts");
    })();
  }, [enabled, hasRun]);

  return null;
}
