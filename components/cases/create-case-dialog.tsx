"use client";

import { useEffect, useRef, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { ScrollArea } from "@/components/ui/scroll-area";

export type CreatedCase = {
  id: string;
  title: string;
  summary: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: CreatedCase) => void;
};

export function CreateCaseDialog({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [result, setResult] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const caseIdRef = useRef<string | null>(null);

  const canSubmit = title.trim().length >= 3 && !isSaving;

  const thumbnailUpload = useSupabaseUpload({
    bucketName: "case-media",
    maxFiles: 1,
    maxFileSize: 20 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    uploadFn: async (file) => {
      const caseId = caseIdRef.current;
      if (!caseId) {
        throw new Error("Create the case first");
      }

      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/cases/${caseId}/media?role=thumbnail`, {
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
      const caseId = caseIdRef.current;
      if (!caseId) {
        throw new Error("Create the case first");
      }

      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/cases/${caseId}/media?role=gallery`, {
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
    if (open) return;
    setTitle("");
    setSummary("");
    setProblem("");
    setSolution("");
    setResult("");
    setError(null);
    setIsSaving(false);
    caseIdRef.current = null;
    thumbnailUpload.setFiles([]);
    galleryUpload.setFiles([]);
    thumbnailUpload.setErrors([]);
    galleryUpload.setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit() {
    if (!canSubmit) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
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
        | { case?: CreatedCase; error?: string }
        | null;

      if (!res.ok || !body?.case) {
        throw new Error(body?.error || "Failed to create case");
      }

      caseIdRef.current = body.case.id;

      // Upload media (best effort). If these fail, keep dialog open and show an error.
      if (thumbnailUpload.files.length > 0) {
        await thumbnailUpload.onUpload();
      }
      if (galleryUpload.files.length > 0) {
        await galleryUpload.onUpload();
      }

      onCreated(body.case);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create case");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Create a case</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-4 pb-6">
            <Field orientation="vertical">
              <FieldLabel>Title</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Increased conversions for a SaaS landing page"
                autoFocus
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Summary (optional)</FieldLabel>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                placeholder="Short overview you can show in your portfolio cards"
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Problem (optional)</FieldLabel>
              <Textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                rows={4}
                placeholder="What was the situation / challenge?"
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Solution (optional)</FieldLabel>
              <Textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                rows={4}
                placeholder="What did you do?"
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Result (optional)</FieldLabel>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={4}
                placeholder="What changed? (metrics, outcomes, testimonials)"
              />
            </Field>

            <div className="space-y-2">
              <FieldLabel>Thumbnail (optional, recommended)</FieldLabel>
              <Dropzone {...thumbnailUpload}>
                <DropzoneEmptyState />
                <DropzoneContent hideUploadButton />
              </Dropzone>
              <p className="text-xs text-muted-foreground">
                Pick files now — they upload after you click “Create case”. Images only.
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel>Gallery media (optional)</FieldLabel>
              <Dropzone {...galleryUpload}>
                <DropzoneEmptyState />
                <DropzoneContent hideUploadButton />
              </Dropzone>
              <p className="text-xs text-muted-foreground">
                Pick files now — they upload after you click “Create case”. Up to 6.
              </p>
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {isSaving ? "Creating…" : "Create case"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
