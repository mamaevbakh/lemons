"use client";

import * as React from "react";

import { DeliveryFiles } from "@/components/orders/delivery-files";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DeliveryFile = {
  path: string;
  name?: string;
  size?: number;
  mime?: string;
  uploadedAt?: string;
};

function parseDeliveryManifest(value: unknown): DeliveryFile[] {
  if (!Array.isArray(value)) return [];
  const files: DeliveryFile[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const maybePath = (item as Record<string, unknown>).path;
    if (typeof maybePath !== "string" || !maybePath.trim()) continue;

    const name = (item as Record<string, unknown>).name;
    const size = (item as Record<string, unknown>).size;
    const mime = (item as Record<string, unknown>).mime;
    const uploadedAt = (item as Record<string, unknown>).uploadedAt;

    files.push({
      path: maybePath,
      name: typeof name === "string" ? name : undefined,
      size: typeof size === "number" ? size : undefined,
      mime: typeof mime === "string" ? mime : undefined,
      uploadedAt: typeof uploadedAt === "string" ? uploadedAt : undefined,
    });
  }

  return files;
}

type Props = {
  orderId: string;
};

export function BuyerDelivery({ orderId }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [deliveredAt, setDeliveredAt] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<DeliveryFile[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orders/delivery/manifest?orderId=${encodeURIComponent(orderId)}`,
          { cache: "no-store" },
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error || "Failed to load delivery");
        }

        const body = (await res.json()) as {
          delivered_at: string | null;
          delivery_message: string | null;
          delivery_manifest: unknown;
        };

        if (cancelled) return;

        setDeliveredAt(body.delivered_at);
        setMessage(body.delivery_message);
        setFiles(parseDeliveryManifest(body.delivery_manifest));
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load delivery";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  // No delivery yet: silently hide.
  if (!deliveredAt && !message && files.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {error ? <div className="text-destructive">{error}</div> : null}
        {message ? <div>{message}</div> : null}
        {deliveredAt ? (
          <div className="text-muted-foreground">
            Delivered {new Date(deliveredAt).toLocaleString()}
          </div>
        ) : null}
        <DeliveryFiles orderId={orderId} files={files} />
      </CardContent>
    </Card>
  );
}
