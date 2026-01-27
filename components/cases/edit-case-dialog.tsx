"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Trash2, Loader2, ImageIcon, Film } from "lucide-react";

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

type MediaItem = {
  id: string;
  role: "thumbnail" | "gallery";
  position: number;
  mediaId: string;
  mimeType: string | null;
  signedUrl: string;
};

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

  // Existing media state
  const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const canSubmit = title.trim().length >= 3 && !isSaving;

  // Fetch existing media
  const fetchMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/cases/${value.id}/media`);
      if (res.ok) {
        const data = await res.json();
        setExistingMedia(data.items ?? []);
      }
    } catch {
      // silently fail, media just won't show
    } finally {
      setLoadingMedia(false);
    }
  }, [value.id]);

  // Delete media handler
  const handleDeleteMedia = async (mediaItem: MediaItem) => {
    setDeletingIds((prev) => new Set(prev).add(mediaItem.id));
    try {
      const res = await fetch(
        `/api/cases/${value.id}/media?mediaId=${mediaItem.mediaId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setExistingMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  };

  const existingThumbnail = existingMedia.find((m) => m.role === "thumbnail");
  const existingGallery = existingMedia.filter((m) => m.role === "gallery");

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

    // Fetch existing media when dialog opens
    fetchMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value.id, fetchMedia]);

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
              
              {/* Show existing thumbnail */}
              {loadingMedia ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading media...
                </div>
              ) : existingThumbnail ? (
                <div className="relative group rounded-lg border overflow-hidden bg-muted">
                  <div className="aspect-video relative">
                    <Image
                      src={existingThumbnail.signedUrl}
                      alt="Thumbnail"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteMedia(existingThumbnail)}
                    disabled={deletingIds.has(existingThumbnail.id)}
                  >
                    {deletingIds.has(existingThumbnail.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Dropzone {...thumbnailUpload}>
                  <DropzoneEmptyState />
                  <DropzoneContent />
                </Dropzone>
              )}
              
              {/* Show dropzone for replacement if thumbnail exists */}
              {existingThumbnail && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Replace thumbnail:</p>
                  <Dropzone {...thumbnailUpload}>
                    <DropzoneEmptyState />
                    <DropzoneContent />
                  </Dropzone>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <FieldLabel>Gallery media (optional)</FieldLabel>
              
              {/* Show existing gallery items */}
              {existingGallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {existingGallery.map((item) => (
                    <div
                      key={item.id}
                      className="relative group rounded-lg border overflow-hidden bg-muted aspect-square"
                    >
                      {item.mimeType?.startsWith("video/") ? (
                        <>
                          <video
                            src={item.signedUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Film className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>
                        </>
                      ) : (
                        <Image
                          src={item.signedUrl}
                          alt="Gallery item"
                          fill
                          className="object-cover"
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteMedia(item)}
                        disabled={deletingIds.has(item.id)}
                      >
                        {deletingIds.has(item.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Dropzone for adding more gallery items */}
              <Dropzone {...galleryUpload}>
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
              <p className="text-xs text-muted-foreground">
                Up to 6 items total. {existingGallery.length > 0 && `${existingGallery.length} already uploaded.`}
              </p>
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
