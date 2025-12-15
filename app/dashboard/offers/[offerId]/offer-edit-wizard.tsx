
"use client";

import { useState, useTransition, useEffect } from "react";
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

import { ChevronsUpDown, Check, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import { OfferAssistantPanel } from "./offer-assistant-panel";

type Offer = Tables<"offers">;
type Category = Tables<"categories">;
type PackageRow = Tables<"packages">;

type OfferEditWizardProps = {
  offer: Offer;
  categories: Category[];
  packages: PackageRow[];
};

export function OfferEditWizard({
  offer,
  categories,
  packages,
}: OfferEditWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();
  const [categoryOpen, setCategoryOpen] = useState(false);

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

  const packagesValues = watch("packages");
  const hasVisiblePackages = (packagesValues ?? []).some(
    (pkg) => pkg && !pkg._deleted,
  );

  const currencyCode = watch("offer.currencyCode") ?? offer.currency_code;
  const offerStatus = watch("offer.status");

  useEffect(() => {
    if (!isPending) {
      setSubmitIntent(null);
      setLoadingButton(null);
    }
  }, [isPending]);

  function goToStep(next: 1 | 2) {
    setStep(next);
  }

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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(1)}
              className="w-full sm:w-auto"
            >
              Back
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
    </form>

      <div className="hidden lg:block lg:sticky min-w-[480px] w-80 border-l pl-2 pb-2 pr-2">
        <OfferAssistantPanel form={form} />
      </div>
    </div>
  );
}
