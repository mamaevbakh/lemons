"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DeliverOrderFormProps = {
  orderId: string;
  disabled?: boolean;
};

export function DeliverOrderForm({ orderId, disabled }: DeliverOrderFormProps) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileCount = files?.length ?? 0;
  const isValid = useMemo(() => {
    return message.trim().length > 0 || fileCount > 0;
  }, [message, fileCount]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isValid || disabled) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const form = new FormData();
      form.set("orderId", orderId);
      form.set("delivery_message", message);

      if (files) {
        Array.from(files).forEach((file) => {
          form.append("files[]", file);
        });
      }

      const res = await fetch("/api/orders/deliver", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Unable to deliver this order");
      }

      setSuccess(true);
      setMessage("");
      setFiles(null);

      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Something went wrong";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="delivery_message">
          Message
        </label>
        <Textarea
          id="delivery_message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a short note for the buyer…"
          disabled={Boolean(disabled) || isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="delivery_files">
          Files
        </label>
        <Input
          id="delivery_files"
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          disabled={Boolean(disabled) || isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Upload your deliverables. Downloads use signed URLs.
        </p>
      </div>

      {success ? (
        <p className="text-sm text-muted-foreground">Delivered.</p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={Boolean(disabled) || isLoading || !isValid}
      >
        {isLoading ? "Delivering…" : "Deliver order"}
      </Button>
    </form>
  );
}
