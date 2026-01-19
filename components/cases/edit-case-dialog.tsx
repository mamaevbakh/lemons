"use client";

import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";

export type EditableCase = {
  id: string;
  title: string;
  summary: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: EditableCase;
  onUpdated: (updated: EditableCase) => void;
};

export function EditCaseDialog({ open, onOpenChange, value, onUpdated }: Props) {
  const [title, setTitle] = useState(value.title);
  const [summary, setSummary] = useState(value.summary ?? "");
  const [problem, setProblem] = useState(value.problem ?? "");
  const [solution, setSolution] = useState(value.solution ?? "");
  const [result, setResult] = useState(value.result ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length >= 3 && !isSaving;

  const thumbnailUpload = useSupabaseUpload({
    bucketName: "case-media",
    maxFiles: 1,
    maxFileSize: 20 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    uploadFn: async (file) => {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/cases/${value.id}/media?role=thumbnail`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to upload thumbnail");
      }
    },
  });

  const galleryUpload = useSupabaseUpload({
    bucketName: "case-media",
    maxFiles: 6,
    maxFileSize: 50 * 1024 * 1024,
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    uploadFn: async (file) => {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/cases/${value.id}/media?role=gallery`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to upload media");
      }
    },
  });

  useEffect(() => {
    if (!open) return;

    setTitle(value.title);
    setSummary(value.summary ?? "");
    setProblem(value.problem ?? "");
    setSolution(value.solution ?? "");
    setResult(value.result ?? "");
    setError(null);
    setIsSaving(false);

    thumbnailUpload.setFiles([]);
    galleryUpload.setFiles([]);
    thumbnailUpload.setErrors([]);
    galleryUpload.setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value.id]);

  async function onSubmit() {
    if (!canSubmit) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/cases/${value.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() ? summary.trim() : null,
          problem: problem.trim() ? problem.trim() : null,
          solution: solution.trim() ? solution.trim() : null,
          result: result.trim() ? result.trim() : null,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { case?: { id: string; title: string; summary: string | null; problem?: string | null; solution?: string | null; result?: string | null }; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(body?.error || "Failed to update case");
      }

      onUpdated({
        id: value.id,
        title: title.trim(),
        summary: summary.trim() ? summary.trim() : null,
        problem: problem.trim() ? problem.trim() : null,
        solution: solution.trim() ? solution.trim() : null,
        result: result.trim() ? result.trim() : null,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update case");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit case</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-4 pb-6">
            <Field orientation="vertical">
              <FieldLabel>Title</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Case title"
                autoFocus
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Summary (optional)</FieldLabel>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Problem (optional)</FieldLabel>
              <Textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                rows={4}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Solution (optional)</FieldLabel>
              <Textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                rows={4}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Result (optional)</FieldLabel>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={4}
              />
            </Field>

            <div className="space-y-2">
              <FieldLabel>Thumbnail (optional)</FieldLabel>
              <Dropzone {...thumbnailUpload}>
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
              <p className="text-xs text-muted-foreground">Uploads to the private bucket: case-media</p>
            </div>

            <div className="space-y-2">
              <FieldLabel>Gallery media (optional)</FieldLabel>
              <Dropzone {...galleryUpload}>
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
