"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Tables } from "@/lib/supabase/types";

import {
  SolutionEditorSchema,
  type SolutionEditorValues,
} from "@/lib/validation/solution-editor";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";

import { cn } from "@/lib/utils";
import { Plus, Trash2, Pencil } from "lucide-react";

import { saveSolutionAction } from "./save-actions";
import { SolutionAssistantPanel } from "./solution-assistant-panel";

import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import {
  CreateCaseDialog,
  type CreatedCase,
} from "@/components/cases/create-case-dialog";
import { EditCaseDialog, type EditableCase } from "@/components/cases/edit-case-dialog";

type Solution = Tables<"solutions">;
type SolutionLinkRow = Tables<"solution_links">;
type SolutionPricingRow = Tables<"solution_pricing_items">;
type SolutionCaseLinkRow = Tables<"solution_case_links">;
type CaseRow = Tables<"cases">;
type OfferRow = Tables<"offers">;

type SolutionMediaJoin = {
  id: string;
  role: string;
  position: number;
  media_id: string;
  media_objects:
    | {
        bucket: string;
        path: string;
        mime_type: string | null;
      }
    | Array<{
        bucket: string;
        path: string;
        mime_type: string | null;
      }>
    | null;
};

type Props = {
  solution: Solution;
  solutionMedia: SolutionMediaJoin[];
  links: SolutionLinkRow[];
  pricingItems: SolutionPricingRow[];
  caseLinks: SolutionCaseLinkRow[];
  availableCases: Pick<
    CaseRow,
    "id" | "title" | "summary" | "problem" | "solution" | "result" | "created_at"
  >[];
  availableOffers: OfferRow[];
};

export function SolutionEditWizard({
  solution,
  solutionMedia,
  links,
  pricingItems,
  caseLinks,
  availableCases,
  availableOffers,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  const [submitIntent, setSubmitIntent] = useState<
    "publish" | "draft" | "archive" | null
  >(null);
  const [loadingButton, setLoadingButton] = useState<
    "publish" | "draft" | "archive" | null
  >(null);

  const [hasLogo, setHasLogo] = useState(false);
  const [hasCover, setHasCover] = useState(false);
  const [hasReel, setHasReel] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [coverVersion, setCoverVersion] = useState(0);
  const [reelVersion, setReelVersion] = useState(0);

  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [availableCasesState, setAvailableCasesState] = useState(availableCases);
  const [editingCase, setEditingCase] = useState<EditableCase | null>(null);

  const defaultLinks = links.map((l) => ({
    id: l.id,
    platform: l.platform,
    url: l.url,
    position: l.position,
    _deleted: false,
  }));

  const defaultPricing = pricingItems.map((p) => ({
    id: p.id,
    title: p.title,
    priceText: p.price_text,
    description: p.description ?? undefined,
    ctaLabel: p.cta_label ?? undefined,
    ctaUrl: p.cta_url ?? undefined,
    position: p.position,
    _deleted: false,
  }));

  const defaultCaseLinks = caseLinks.map((c) => ({
    id: c.id,
    caseId: c.case_id,
    position: c.position,
    _deleted: false,
  }));

  const form = useForm<SolutionEditorValues>({
    resolver: zodResolver(SolutionEditorSchema),
    defaultValues: {
      solutionId: solution.id,
      solution: {
        title: solution.title,
        headline: solution.headline ?? "",
        description: solution.description ?? "",
        websiteUrl: solution.website_url ?? "",
        slug: solution.slug,
        status: solution.status,
        featuredOfferIds: solution.featured_offer_ids ?? [],
      },
      links: defaultLinks,
      pricingItems: defaultPricing,
      caseLinks: defaultCaseLinks,
    },
  });

  const { control, handleSubmit, watch, setValue } = form;

  const solutionStatus = watch("solution.status");

  useEffect(() => {
    if (!isPending) {
      setSubmitIntent(null);
      setLoadingButton(null);
    }
  }, [isPending]);

  function goToStep(next: 1 | 2 | 3) {
    setStep(next);
  }

  const linksArray = useFieldArray({ control, name: "links" });
  const pricingArray = useFieldArray({ control, name: "pricingItems" });
  const casesArray = useFieldArray({ control, name: "caseLinks" });

  const logoSrc = useMemo(() => {
    if (!hasLogo) return null;
    return `/api/solutions/${solution.id}/media/logo?redirect=1&v=${logoVersion}`;
  }, [hasLogo, logoVersion, solution.id]);

  const coverSrc = useMemo(() => {
    if (!hasCover) return null;
    return `/api/solutions/${solution.id}/media/cover?redirect=1&v=${coverVersion}`;
  }, [hasCover, coverVersion, solution.id]);

  const reelSrc = useMemo(() => {
    if (!hasReel) return null;
    return `/api/solutions/${solution.id}/media/reel?redirect=1&v=${reelVersion}`;
  }, [hasReel, reelVersion, solution.id]);

  const logoUpload = useSupabaseUpload({
    bucketName: "solution-media",
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    uploadFn: async (file) => {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/solutions/${solution.id}/media/logo`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Upload failed");
      }
    },
  });

  const coverUpload = useSupabaseUpload({
    bucketName: "solution-media",
    maxFiles: 1,
    maxFileSize: 20 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    uploadFn: async (file) => {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/solutions/${solution.id}/media/cover`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Upload failed");
      }
    },
  });

  const reelUpload = useSupabaseUpload({
    bucketName: "solution-media",
    maxFiles: 1,
    maxFileSize: 50 * 1024 * 1024,
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    uploadFn: async (file) => {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/solutions/${solution.id}/media/reel`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Upload failed");
      }
    },
  });

  // Detect existing media on mount.
  useEffect(() => {
    let cancelled = false;

    const existingLogo = solutionMedia.some((m) => m.role === "logo");
    const existingCover = solutionMedia.some((m) => m.role === "cover");
    const existingReel = solutionMedia.some((m) => m.role === "reel");

    if (!cancelled) {
      setHasLogo(existingLogo);
      setHasCover(existingCover);
      setHasReel(existingReel);
    }

    return () => {
      cancelled = true;
    };
  }, [solutionMedia]);

  useEffect(() => {
    if (logoUpload.isSuccess) {
      setHasLogo(true);
      setLogoVersion((v) => v + 1);
    }
  }, [logoUpload.isSuccess]);

  useEffect(() => {
    if (coverUpload.isSuccess) {
      setHasCover(true);
      setCoverVersion((v) => v + 1);
    }
  }, [coverUpload.isSuccess]);

  useEffect(() => {
    if (reelUpload.isSuccess) {
      setHasReel(true);
      setReelVersion((v) => v + 1);
    }
  }, [reelUpload.isSuccess]);

  async function removeMedia(role: "logo" | "cover") {
    const res = await fetch(`/api/solutions/${solution.id}/media/${role}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      return;
    }

    if (role === "logo") {
      setHasLogo(false);
      setLogoVersion((v) => v + 1);
    } else {
      setHasCover(false);
      setCoverVersion((v) => v + 1);
    }
  }

  async function removeReel() {
    const res = await fetch(`/api/solutions/${solution.id}/media/reel`, {
      method: "DELETE",
    });

    if (!res.ok) {
      return;
    }

    setHasReel(false);
    setReelVersion((v) => v + 1);
  }

  function onSubmit(values: SolutionEditorValues) {
    const nextStatus =
      submitIntent === "publish"
        ? "published"
        : submitIntent === "archive"
          ? "archived"
          : submitIntent === "draft"
            ? "draft"
            : values.solution.status;

    const payload: SolutionEditorValues = {
      ...values,
      solution: {
        ...values.solution,
        status: nextStatus,
      },
    };

    startTransition(() => {
      saveSolutionAction(payload);
    });
  }

  const featuredOfferIds = watch("solution.featuredOfferIds") ?? [];
  const visibleLinks = (watch("links") ?? []).filter((l) => !l?._deleted);
  const visiblePricing = (watch("pricingItems") ?? []).filter((p) => !p?._deleted);
  const visibleCases = (watch("caseLinks") ?? []).filter((c) => !c?._deleted);

  const attachCase = (caseId: string) => {
    const existingIndex = (watch("caseLinks") ?? []).findIndex(
      (x) => x.caseId === caseId,
    );

    if (existingIndex >= 0) {
      setValue(`caseLinks.${existingIndex}._deleted`, false, { shouldDirty: true });
      return;
    }

    casesArray.append({
      id: crypto.randomUUID(),
      caseId,
      position: casesArray.fields.length,
      _deleted: false,
    });
  };

  const detachCase = (caseId: string) => {
    const idx = (watch("caseLinks") ?? []).findIndex(
      (x) => x.caseId === caseId && !x._deleted,
    );
    if (idx >= 0) {
      setValue(`caseLinks.${idx}._deleted`, true, { shouldDirty: true });
    }
  };

  const onCaseCreated = (created: CreatedCase) => {
    setAvailableCasesState((prev) => [created, ...prev]);
    attachCase(created.id);
  };

  const onCaseUpdated = (updated: EditableCase) => {
    setAvailableCasesState((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    );
  };

  return (
    <div className="flex w-full gap-2 min-h-full max-h-full">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 flex-auto overflow-y-auto p-6"
      >
        {/* Step indicator + status pill */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button
            type="button"
            variant={step === 1 ? "default" : "outline"}
            size="sm"
            onClick={() => goToStep(1)}
            className="w-full sm:w-auto"
          >
            1. Details
          </Button>
          <Button
            type="button"
            variant={step === 2 ? "default" : "outline"}
            size="sm"
            onClick={() => goToStep(2)}
            className="w-full sm:w-auto"
          >
            2. Media
          </Button>
          <Button
            type="button"
            variant={step === 3 ? "default" : "outline"}
            size="sm"
            onClick={() => goToStep(3)}
            className="w-full sm:w-auto"
          >
            3. Links, pricing & portfolio
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
            <span>Status:</span>
            <Badge
              variant={
                solutionStatus === "published"
                  ? "default"
                  : solutionStatus === "archived"
                    ? "secondary"
                    : "outline"
              }
            >
              {solutionStatus === "published"
                ? "Published"
                : solutionStatus === "archived"
                  ? "Archived"
                  : "Draft"}
            </Badge>
          </div>
        </div>

        {/* STEP 1: DETAILS */}
        {step === 1 && (
          <div className="space-y-6">
            <FieldSet>
              <FieldLegend>Solution details</FieldLegend>
              <FieldDescription>
                This information appears on your public solution page.
              </FieldDescription>

              <FieldGroup className="flex flex-col gap-6">
                <Controller
                  name="solution.title"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="Acme Studio"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="solution.headline"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Headline</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="We build high-converting landing pages for founders"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                      <FieldDescription>
                        One sentence explaining what you do.
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="solution.websiteUrl"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Website</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="https://example.com"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                      <FieldDescription>
                        Optional. Shown as a prominent CTA.
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="solution.slug"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="acme-studio"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                      <FieldDescription>
                        Used for your public URL: /solutions/{watch("solution.slug")}.
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="solution.description"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} orientation="vertical">
                      <FieldLabel htmlFor={field.name}>About</FieldLabel>
                      <Textarea
                        {...field}
                        id={field.name}
                        rows={6}
                        aria-invalid={fieldState.invalid}
                        placeholder="Tell your story: who you help, what you deliver, why you’re different."
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </FieldSet>

            <div className="flex justify-end">
              <Button type="button" onClick={() => goToStep(2)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: MEDIA */}
        {step === 2 && (
          <div className="space-y-6">
            <FieldSet>
              <FieldLegend>Media</FieldLegend>
              <FieldDescription>
                Upload your logo and a cover image. Stored in the private
                {" "}
                <span className="font-medium">solution-media</span> bucket and
                served with signed URLs.
              </FieldDescription>

              <FieldGroup className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <FieldTitle>Logo</FieldTitle>
                  {logoSrc ? (
                    <div className="flex items-start gap-3">
                      <div className="h-20 w-20 rounded-lg border bg-muted overflow-hidden">
                        <img
                          src={logoSrc}
                          alt="Solution logo"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeMedia("logo")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No logo uploaded yet.
                    </div>
                  )}

                  <Dropzone {...logoUpload}>
                    <DropzoneEmptyState />
                    <DropzoneContent />
                  </Dropzone>
                </div>

                <div className="space-y-3">
                  <FieldTitle>Cover</FieldTitle>
                  {coverSrc ? (
                    <div className="space-y-3">
                      <div className="aspect-video w-full rounded-lg border bg-muted overflow-hidden">
                        <img
                          src={coverSrc}
                          alt="Solution cover"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeMedia("cover")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No cover uploaded yet.
                    </div>
                  )}

                  <Dropzone {...coverUpload}>
                    <DropzoneEmptyState />
                    <DropzoneContent />
                  </Dropzone>
                </div>
              </FieldGroup>

              <div className="mt-6 space-y-3">
                <FieldTitle>Cover video (reel)</FieldTitle>
                <FieldDescription>
                  Optional vertical intro video (9:16), displayed on your public
                  solution page.
                </FieldDescription>

                {reelSrc ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="w-full max-w-[320px] overflow-hidden rounded-xl border bg-muted">
                      <div className="aspect-9/16">
                        <video
                          key={reelSrc}
                          src={reelSrc}
                          controls
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={removeReel}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No reel uploaded yet.
                  </div>
                )}

                <Dropzone {...reelUpload}>
                  <DropzoneEmptyState />
                  <DropzoneContent />
                </Dropzone>
              </div>
            </FieldSet>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => goToStep(1)}>
                Back
              </Button>
              <Button type="button" onClick={() => goToStep(3)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: LINKS, PRICING, PORTFOLIO */}
        {step === 3 && (
          <div className="space-y-8">
            <FieldSet>
              <FieldLegend>Social links</FieldLegend>
              <FieldDescription>
                Add your social links (e.g. LinkedIn, X, GitHub).
              </FieldDescription>

              <div className="space-y-4">
                {linksArray.fields.length === 0 || visibleLinks.length === 0 ? (
                  <Empty>
                    <EmptyContent>
                      <EmptyDescription>
                        No links yet. Add your first one.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                ) : null}

                <div className="space-y-4">
                  {linksArray.fields.map((field, idx) => {
                    const deleted = watch(`links.${idx}._deleted`) ?? false;
                    return (
                      <div
                        key={field.id}
                        className={cn(
                          "rounded-xl border p-4",
                          deleted && "opacity-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">Link {idx + 1}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setValue(`links.${idx}._deleted`, !deleted, {
                                shouldDirty: true,
                              })
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleted ? "Undo" : "Remove"}
                          </Button>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <Controller
                            name={`links.${idx}.platform`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>Platform</FieldLabel>
                                <Input
                                  {...field}
                                  id={field.name}
                                  placeholder="LinkedIn"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`links.${idx}.url`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>URL</FieldLabel>
                                <Input
                                  {...field}
                                  id={field.name}
                                  placeholder="https://..."
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    linksArray.append({
                      id: crypto.randomUUID(),
                      platform: "",
                      url: "https://",
                      position: linksArray.fields.length,
                      _deleted: false,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add link
                </Button>
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Pricing</FieldLegend>
              <FieldDescription>
                Create pricing cards for your service or retainers.
              </FieldDescription>

              <div className="space-y-4">
                {pricingArray.fields.length === 0 || visiblePricing.length === 0 ? (
                  <Empty>
                    <EmptyContent>
                      <EmptyDescription>
                        No pricing items yet. Add one to show pricing.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                ) : null}

                <div className="space-y-4">
                  {pricingArray.fields.map((field, idx) => {
                    const deleted = watch(`pricingItems.${idx}._deleted`) ?? false;
                    return (
                      <div
                        key={field.id}
                        className={cn(
                          "rounded-xl border p-4",
                          deleted && "opacity-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">Pricing {idx + 1}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setValue(`pricingItems.${idx}._deleted`, !deleted, {
                                shouldDirty: true,
                              })
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleted ? "Undo" : "Remove"}
                          </Button>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <Controller
                            name={`pricingItems.${idx}.title`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                                <Input
                                  {...field}
                                  id={field.name}
                                  placeholder="Starter"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`pricingItems.${idx}.priceText`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>Price</FieldLabel>
                                <Input
                                  {...field}
                                  id={field.name}
                                  placeholder="$2,000 / month"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`pricingItems.${idx}.ctaLabel`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>CTA label</FieldLabel>
                                <Input
                                  {...field}
                                  id={field.name}
                                  placeholder="Book a call"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />

                          <Controller
                            name={`pricingItems.${idx}.ctaUrl`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={field.name}>CTA URL</FieldLabel>
                                <Input
                                  {...field}
                                  id={field.name}
                                  placeholder="https://..."
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />
                        </div>

                        <div className="mt-4">
                          <Controller
                            name={`pricingItems.${idx}.description`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid} orientation="vertical">
                                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                                <Textarea
                                  {...field}
                                  id={field.name}
                                  rows={4}
                                  placeholder="What’s included?"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError errors={[fieldState.error]} />
                                )}
                              </Field>
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    pricingArray.append({
                      id: crypto.randomUUID(),
                      title: "",
                      priceText: "",
                      description: "",
                      ctaLabel: "",
                      ctaUrl: "https://",
                      position: pricingArray.fields.length,
                      _deleted: false,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add pricing item
                </Button>
              </div>
            </FieldSet>

            <FieldSet>
              <div className="flex items-center justify-between gap-3">
                <FieldLegend>Portfolio cases</FieldLegend>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateCaseOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create case
                </Button>
              </div>
              <FieldDescription>
                Pick cases to showcase on the public solution page.
              </FieldDescription>

              <div className="space-y-4">
                {availableCasesState.length === 0 ? (
                  <Empty>
                    <EmptyContent>
                      <EmptyDescription>
                        No cases found. Create a case first.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                ) : null}

                <div className="grid gap-2">
                  {availableCasesState.slice(0, 12).map((c) => {
                    const selected = visibleCases.some((x) => x.caseId === c.id);
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2 py-2 text-sm transition",
                          selected
                            ? "border-primary bg-primary/10"
                            : "hover:border-primary/60",
                        )}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-1 text-left"
                          onClick={() => {
                            if (selected) {
                              detachCase(c.id);
                              return;
                            }

                            attachCase(c.id);
                          }}
                        >
                          <span className="line-clamp-1">{c.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {selected ? "Selected" : "Add"}
                          </span>
                        </button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingCase({
                              id: c.id,
                              title: c.title,
                              summary: c.summary ?? null,
                              problem: c.problem ?? null,
                              solution: c.solution ?? null,
                              result: c.result ?? null,
                            });
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {visibleCases.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Selected: {visibleCases.length}
                  </div>
                ) : null}
              </div>
            </FieldSet>

            <CreateCaseDialog
              open={isCreateCaseOpen}
              onOpenChange={setIsCreateCaseOpen}
              onCreated={onCaseCreated}
            />

            {editingCase ? (
              <EditCaseDialog
                open={!!editingCase}
                onOpenChange={(next) => {
                  if (!next) setEditingCase(null);
                }}
                value={editingCase}
                onUpdated={(updated) => {
                  onCaseUpdated(updated);
                  setEditingCase(null);
                }}
              />
            ) : null}

            <FieldSet>
              <FieldLegend>Featured offers</FieldLegend>
              <FieldDescription>
                Select offers to feature on the public solution page.
              </FieldDescription>

              <div className="grid gap-2">
                {availableOffers.slice(0, 12).map((o) => {
                  const checked = featuredOfferIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                        checked
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/60",
                      )}
                      onClick={() => {
                        const next = checked
                          ? featuredOfferIds.filter((id) => id !== o.id)
                          : [...featuredOfferIds, o.id];
                        setValue("solution.featuredOfferIds", next, {
                          shouldDirty: true,
                        });
                      }}
                    >
                      <span className="line-clamp-1">{o.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {checked ? "Featured" : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FieldSet>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => goToStep(2)}>
                Back
              </Button>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setSubmitIntent("draft");
                    setLoadingButton("draft");
                    setValue("solution.status", "draft", { shouldDirty: true });
                  }}
                >
                  {loadingButton === "draft" && isPending ? (
                    <Spinner className="mr-2" />
                  ) : null}
                  Save draft
                </Button>

                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => {
                    setSubmitIntent("archive");
                    setLoadingButton("archive");
                    setValue("solution.status", "archived", { shouldDirty: true });
                  }}
                >
                  {loadingButton === "archive" && isPending ? (
                    <Spinner className="mr-2" />
                  ) : null}
                  Archive
                </Button>

                <Button
                  type="submit"
                  disabled={isPending}
                  onClick={() => {
                    setSubmitIntent("publish");
                    setLoadingButton("publish");
                    setValue("solution.status", "published", { shouldDirty: true });
                  }}
                >
                  {loadingButton === "publish" && isPending ? (
                    <Spinner className="mr-2" />
                  ) : null}
                  Publish
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>

      <div className="hidden w-[420px] shrink-0 border-l bg-background p-4 lg:block">
        <SolutionAssistantPanel
          form={form}
          availableCases={availableCasesState.map((c) => ({
            id: c.id,
            title: c.title,
          }))}
          onCaseCreated={onCaseCreated}
          onCaseUpdated={onCaseUpdated}
        />
      </div>
    </div>
  );
}
