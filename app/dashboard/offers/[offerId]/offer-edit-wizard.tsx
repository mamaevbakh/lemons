
"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Tables } from "@/lib/supabase/types";

import {
  OfferWithPackagesSchema,
  type OfferWithPackagesValues,
} from "@/lib/validation/offer-with-packages";
import { saveOfferAndPackagesAction } from "./save-actions";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

import { ChevronsUpDown, Check, Trash2, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import { OfferAssistantPanel } from "./offer-assistant-panel";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import {
  CreateCaseDialog,
  type CreatedCase,
} from "@/components/cases/create-case-dialog";
import { EditCaseDialog, type EditableCase } from "@/components/cases/edit-case-dialog";

type Offer = Tables<"offers">;
type Category = Tables<"categories">;
type PackageRow = Tables<"packages">;
type OfferCaseLinkRow = Tables<"offer_case_links">;
type CaseRow = Tables<"cases">;

type OfferEditWizardProps = {
  offer: Offer;
  categories: Category[];
  packages: PackageRow[];
  caseLinks: OfferCaseLinkRow[];
  availableCases: Pick<
    CaseRow,
    "id" | "title" | "summary" | "problem" | "solution" | "result" | "created_at"
  >[];
};

export function OfferEditWizard({
  offer,
  categories,
  packages,
  caseLinks,
  availableCases,
}: OfferEditWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [hasReel, setHasReel] = useState(false);
  const [reelVersion, setReelVersion] = useState(0);

  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [availableCasesState, setAvailableCasesState] = useState(availableCases);
  const [editingCase, setEditingCase] = useState<EditableCase | null>(null);

  const [submitIntent, setSubmitIntent] = useState<"publish" | "draft" | null>(
    null,
  );
  const [loadingButton, setLoadingButton] = useState<"publish" | "draft" | null>(
    null,
  );

  const form = useForm<OfferWithPackagesValues>({
    resolver: zodResolver(OfferWithPackagesSchema),
    defaultValues: {
      offerId: offer.id,
      offer: {
        title: offer.title,
        description: offer.description ?? "",
        categoryId: offer.category_id,
        tags: offer.tags ?? [],
        status: offer.offer_status,
        currencyCode: offer.currency_code ?? "EUR",
      },
      packages: packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        priceCents: pkg.price_cents,
        deliveryDays: pkg.delivery_days,
        revisions: pkg.revisions,
        _deleted: false,
      })),
      caseLinks: (caseLinks ?? []).map((l) => ({
        id: l.id,
        caseId: l.case_id,
        position: l.position,
        _deleted: false,
      })),
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
  } = form;

  const { fields, append } = useFieldArray({
    control,
    name: "packages",
  });

  const caseLinksArray = useFieldArray({
    control,
    name: "caseLinks",
  });

  const packagesValues = watch("packages");
  const hasVisiblePackages = (packagesValues ?? []).some(
    (pkg) => pkg && !pkg._deleted,
  );

  const currencyCode = watch("offer.currencyCode") ?? offer.currency_code;
  const offerStatus = watch("offer.status");

  const visibleCaseLinks = (watch("caseLinks") ?? []).filter((c) => !c?._deleted);

  const attachCase = (caseId: string) => {
    const existingIndex = (watch("caseLinks") ?? []).findIndex(
      (x) => x.caseId === caseId,
    );

    if (existingIndex >= 0) {
      setValue(`caseLinks.${existingIndex}._deleted`, false, { shouldDirty: true });
      return;
    }

    caseLinksArray.append({
      id: crypto.randomUUID(),
      caseId,
      position: caseLinksArray.fields.length,
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

  useEffect(() => {
    if (!isPending) {
      setSubmitIntent(null);
      setLoadingButton(null);
    }
  }, [isPending]);

  function goToStep(next: 1 | 2 | 3) {
    setStep(next);
  }

  const reelSrc = useMemo(() => {
    if (!hasReel) return null;
    return `/api/offers/${offer.id}/reel?redirect=1&v=${reelVersion}`;
  }, [hasReel, offer.id, reelVersion]);

  const reelUpload = useSupabaseUpload({
    bucketName: "offer-media",
    maxFiles: 1,
    maxFileSize: 50 * 1024 * 1024,
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    uploadFn: async (file) => {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch(`/api/offers/${offer.id}/reel`, {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/offers/${offer.id}/reel`, {
        method: "GET",
      });
      if (cancelled) return;
      setHasReel(res.ok);
    })().catch(() => {
      if (!cancelled) setHasReel(false);
    });

    return () => {
      cancelled = true;
    };
  }, [offer.id]);

  useEffect(() => {
    if (reelUpload.isSuccess) {
      setHasReel(true);
      setReelVersion((v) => v + 1);
    }
  }, [reelUpload.isSuccess]);

  function onSubmit(values: OfferWithPackagesValues) {
    const nextStatus =
      submitIntent === "publish"
        ? "active"
        : submitIntent === "draft"
          ? "draft"
          : values.offer.status;

    const payload: OfferWithPackagesValues = {
      ...values,
      offer: {
        ...values.offer,
        status: nextStatus,
      },
    };

    startTransition(() => {
      saveOfferAndPackagesAction(payload);
    });
  }

  return (
    <div className="flex w-full gap-2 h-full overflow-hidden">
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
          1. Offer details
        </Button>
        <Button
          type="button"
          variant={step === 2 ? "default" : "outline"}
          size="sm"
          onClick={() => goToStep(2)}
          className="w-full sm:w-auto"
        >
          2. Packages & pricing
        </Button>

        <Button
          type="button"
          variant={step === 3 ? "default" : "outline"}
          size="sm"
          onClick={() => goToStep(3)}
          className="w-full sm:w-auto"
        >
          3. Reel video
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
          <span>Status:</span>
          <Badge variant={offerStatus === "active" ? "default" : "outline"}>
            {offerStatus === "active" ? "Active" : "Draft"}
          </Badge>
        </div>
      </div>

      {/* STEP 1: OFFER DETAILS */}
      {step === 1 && (
        <div className="space-y-6">
          <FieldSet>
            <FieldLegend>Offer details</FieldLegend>
            <FieldDescription>
              This information appears on your public offer page.
            </FieldDescription>
            <FieldGroup className="flex flex-col gap-6">
              {/* Title */}
              <Controller
                name="offer.title"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="I will build your high-converting website"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                    />
                    <FieldDescription>
                      Keep it short, clear, and benefit-focused.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Description */}
              <Controller
                name="offer.description"
                control={control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    orientation="vertical"
                  >
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <Textarea
                      {...field}
                      id={field.name}
                      rows={5}
                      aria-invalid={fieldState.invalid}
                      placeholder="Describe your process, what clients get, and what makes you different."
                    />
                    <FieldDescription>
                      A detailed, specific description improves conversions.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Category */}
              <Controller
                name="offer.categoryId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field
                    orientation="vertical"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel htmlFor={field.name}>Category</FieldLabel>

                    <Popover
                      open={categoryOpen}
                      onOpenChange={setCategoryOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryOpen}
                          className="w-full justify-between"
                          aria-invalid={fieldState.invalid}
                        >
                          {field.value
                            ? categories.find((c) => c.id === field.value)
                                ?.name ?? "Unknown category"
                            : "Select category"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search categories..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                              {categories.map((cat) => (
                                <CommandItem
                                  key={cat.id}
                                  value={cat.name}
                                  onSelect={() => {
                                    field.onChange(cat.id);
                                    setCategoryOpen(false);
                                  }}
                                >
                                  {cat.name}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      field.value === cat.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <FieldDescription>
                      Choose the most relevant category for your service.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Tags */}
              <Controller
                name="offer.tags"
                control={control}
                render={({ field, fieldState }) => (
                  <Field
                    orientation="vertical"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel>Tags</FieldLabel>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="e.g. nextjs, saas, landing-page"
                    />
                    <FieldDescription>
                      Tags help buyers find your offer in search.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              onClick={() => goToStep(2)}
            >
              Next: Packages
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: PACKAGES */}
      {step === 2 && (
        <div className="space-y-6">
          <FieldSet>
            <FieldLegend>Packages & pricing</FieldLegend>
            <FieldDescription>
              Edit your packages. Starting price and standard delivery are
              computed automatically from these values.
            </FieldDescription>
            <FieldGroup>
              {/* Add package – for now creates a blank package row */}
              <div className="flex flex-col items-stretch gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      id: undefined,
                      name: "",
                      description: "",
                      priceCents: 0,
                      deliveryDays: 7,
                      revisions: 1,
                      _deleted: false,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add package
                </Button>
              </div>

              {!hasVisiblePackages ? (
                <Empty className="rounded-md border p-4 md:p-6">
                  <EmptyContent>
                    <EmptyDescription className="text-xs">
                      No packages yet. Add one above to define your pricing.
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : (
                <FieldGroup >
                  {fields.map((pkgField, index) => {
                    const deleted = watch(`packages.${index}._deleted`);

                    // Hide soft-deleted packages in UI
                    if (deleted) return null;

                    return (
                      <FieldSet
                        key={pkgField.id ?? `package-${index}`}
                        className="flex flex-col rounded-sm border p-4 bg-card"
                      >
                        <div className="flex flex-row items-center justify-between">
                          <FieldLegend>
                            {watch(`packages.${index}.name`) ||
                              `Package ${index + 1}`}
                          </FieldLegend>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setValue(`packages.${index}._deleted`, true)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          
                        </div>
                        
                        <FieldGroup>
                          {/* Name */}
                          <Controller
                            name={`packages.${index}.name`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Name</FieldLabel>
                                
                                <Input
                                  {...field}
                                  aria-invalid={fieldState.invalid}
                                  autoComplete="off"
                                />
                                {fieldState.invalid && (
                                  <FieldError
                                    errors={[fieldState.error]}
                                  />
                                )}
                              </Field>
                            )}
                          />

                          {/* Description */}
                          <Controller
                            name={`packages.${index}.description`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Description</FieldLabel>
                                <Textarea
                                  {...field}
                                  rows={3}
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError
                                    errors={[fieldState.error]}
                                  />
                                )}
                              </Field>
                            )}
                          />

                          {/* Price */}
                          <Controller
                            name={`packages.${index}.priceCents`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>
                                  Price ({currencyCode})
                                </FieldLabel>
                                <Input
                                  type="number"
                                  min={0}
                                  value={field.value / 100}
                                  onChange={(e) => {
                                    const value = Number(
                                      e.target.value || "0",
                                    );
                                    field.onChange(
                                      Math.round(value * 100),
                                    );
                                  }}
                                  aria-invalid={fieldState.invalid}
                                />
                                <FieldDescription>
                                  Buyers will see this as{" "}
                                  {currencyCode} {field.value / 100}.
                                </FieldDescription>
                                {fieldState.invalid && (
                                  <FieldError
                                    errors={[fieldState.error]}
                                  />
                                )}
                              </Field>
                            )}
                          />

                          {/* Delivery days */}
                          <Controller
                            name={`packages.${index}.deliveryDays`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Delivery (days)</FieldLabel>
                                <Input
                                  type="number"
                                  min={1}
                                  value={field.value}
                                  onChange={(e) =>
                                    field.onChange(
                                      Number(e.target.value || "1"),
                                    )
                                  }
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError
                                    errors={[fieldState.error]}
                                  />
                                )}
                              </Field>
                            )}
                          />

                          {/* Revisions */}
                          <Controller
                            name={`packages.${index}.revisions`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Revisions</FieldLabel>
                                <Input
                                  type="number"
                                  min={0}
                                  value={field.value}
                                  onChange={(e) =>
                                    field.onChange(
                                      Number(e.target.value || "0"),
                                    )
                                  }
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                  <FieldError
                                    errors={[fieldState.error]}
                                  />
                                )}
                              </Field>
                            )}
                          />
                        </FieldGroup>
                      </FieldSet>
                    );
                  })}
                </FieldGroup>
              )}
            </FieldGroup>
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
              Attach existing cases (or create a new one) to showcase in this offer.
            </FieldDescription>

            <div className="space-y-4">
              {availableCasesState.length === 0 ? (
                <Empty>
                  <EmptyContent>
                    <EmptyDescription>
                      No cases yet. Create your first case.
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : null}

              <div className="grid gap-2">
                {availableCasesState.slice(0, 12).map((c) => {
                  const selected = visibleCaseLinks.some((x) => x.caseId === c.id);
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

              {visibleCaseLinks.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  Selected: {visibleCaseLinks.length}
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(1)}
              className="w-full sm:w-auto"
            >
              Back
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(3)}
              className="w-full sm:w-auto"
            >
              Next: Reel video
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              {/* Save as draft */}
              <Button
                type="submit"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setSubmitIntent("draft");
                  setLoadingButton("draft");
                  form.setValue("offer.status", "draft");
                }}
                className="w-full sm:w-auto"
              >
                {loadingButton === "draft" && isPending && (
                  <Spinner className="mr-2 h-4 w-4" />
                )}
                {loadingButton === "draft" && isPending
                  ? "Saving..."
                  : "Save as draft"}
              </Button>

              {/* Publish */}
              <Button
                type="submit"
                disabled={isPending}
                onClick={() => {
                  setSubmitIntent("publish");
                  setLoadingButton("publish");
                  form.setValue("offer.status", "active");
                }}
                className="w-full sm:w-auto"
              >
                {loadingButton === "publish" && isPending && (
                  <Spinner className="mr-2 h-4 w-4" />
                )}
                {loadingButton === "publish" && isPending
                  ? "Publishing..."
                  : "Publish offer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REEL VIDEO */}
      {step === 3 && (
        <div className="space-y-6">
          <FieldSet>
            <FieldLegend>Reel video</FieldLegend>
            <FieldDescription>
              Upload a vertical intro video (like Reels/Shorts). This appears on the left
              side of your public offer page.
            </FieldDescription>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="w-full">
                <div className="aspect-9/16 w-full overflow-hidden rounded-xl border bg-black">
                  {reelSrc ? (
                    <video
                      key={reelSrc}
                      src={reelSrc}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No reel uploaded yet.
                    </div>
                  )}
                </div>

                {hasReel && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const res = await fetch(`/api/offers/${offer.id}/reel`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          setHasReel(false);
                          setReelVersion((v) => v + 1);
                          reelUpload.setFiles([]);
                          reelUpload.setErrors([]);
                        }
                      }}
                    >
                      Remove video
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Dropzone {...reelUpload} className="p-6">
                  <DropzoneEmptyState />
                  <DropzoneContent />
                </Dropzone>

                <p className="mt-2 text-xs text-muted-foreground">
                  Recommended: 9:16, MP4/WebM, up to 50MB.
                </p>
              </div>
            </div>
          </FieldSet>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(2)}
              className="w-full sm:w-auto"
            >
              Back
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                type="submit"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setSubmitIntent("draft");
                  setLoadingButton("draft");
                  form.setValue("offer.status", "draft");
                }}
                className="w-full sm:w-auto"
              >
                {loadingButton === "draft" && isPending && (
                  <Spinner className="mr-2 h-4 w-4" />
                )}
                {loadingButton === "draft" && isPending
                  ? "Saving..."
                  : "Save as draft"}
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                onClick={() => {
                  setSubmitIntent("publish");
                  setLoadingButton("publish");
                  form.setValue("offer.status", "active");
                }}
                className="w-full sm:w-auto"
              >
                {loadingButton === "publish" && isPending && (
                  <Spinner className="mr-2 h-4 w-4" />
                )}
                {loadingButton === "publish" && isPending
                  ? "Publishing..."
                  : "Publish offer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>

      <div className="hidden lg:flex lg:flex-col min-w-[480px] w-80 h-full overflow-hidden border-l pl-2 pb-2 pr-2">
        <OfferAssistantPanel
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
