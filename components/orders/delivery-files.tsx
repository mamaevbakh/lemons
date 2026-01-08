"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

type DeliveryFile = {
  path: string;
  name?: string;
  size?: number;
  mime?: string;
  uploadedAt?: string;
};

type Props = {
  orderId: string;
  files: DeliveryFile[];
};

export function DeliveryFiles({ orderId, files }: Props) {
  const [downloadingPath, setDownloadingPath] = React.useState<string | null>(null);

  async function onDownload(path: string) {
    setDownloadingPath(path);
    try {
      // We use window.location to follow server-side redirect to signed URL.
      const url = `/api/orders/delivery/download?orderId=${encodeURIComponent(
        orderId,
      )}&path=${encodeURIComponent(path)}`;
      window.location.href = url;
    } finally {
      // If the download opens in same tab, state reset may not run; fine.
      setDownloadingPath(null);
    }
  }

  if (!files?.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground">Files:</div>
      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-3">
            <div className="text-sm truncate">{f.name ?? "File"}</div>
            <Button
              variant="outline"
              size="sm"
              disabled={downloadingPath === f.path}
              onClick={() => onDownload(f.path)}
            >
              {downloadingPath === f.path ? "Preparing…" : "Download"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
