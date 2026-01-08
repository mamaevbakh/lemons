"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";

export default function OrderSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id")?.trim() || null;
  const returnTo = useMemo(() => {
    if (!sessionId) return "/";
    return `/orders/success?session_id=${encodeURIComponent(sessionId)}`;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!sessionId) {
        router.replace("/");
        return;
      }

      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        try {
          const res = await fetch(
            `/api/orders/claim?session_id=${encodeURIComponent(sessionId)}`,
            { method: "GET" },
          );

          if (res.status === 401) {
            router.replace(`/auth?next=${encodeURIComponent(returnTo)}`);
            return;
          }

          if (res.ok) {
            const body = (await res.json().catch(() => null)) as
              | { orderId?: string }
              | null;
            const orderId = body?.orderId;
            if (orderId) {
              router.replace(`/dashboard/orders/${orderId}`);
              return;
            }
          }
        } catch {
          // ignore and retry
        }

        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, sessionId, returnTo]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center gap-3">
        <Spinner className="size-6" />
        <p className="text-sm text-muted-foreground">
          Thanks! Your payment was successful. We’re creating your order now.
        </p>
      </div>
    </div>
  );
}
