"use client";

import { useTransition, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form, FormField } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Button } from "@/components/ui/button";

import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";

import type { Tables } from "@/lib/supabase/types";
import {
  OfferFormSchema,
  type OfferFormValues,
} from "@/lib/validation/offer-form";
import { updateOfferAction } from "./actions";


type Offer = Tables<"offers">;
type Category = Tables<"categories">;

type OfferEditorProps = {
  offer: Offer;
  categories: Category[];
};

export function OfferEditor({ offer, categories }: OfferEditorProps) {
  const [isPending, startTransition] = useTransition();

  

const form = useForm<OfferFormValues>({
  resolver: zodResolver(OfferFormSchema) as any,
  defaultValues: {
    title: offer.title,
    description: offer.description ?? "",
    categoryId: offer.category_id,
    tags: offer.tags ?? [],
    startingPrice: offer.starting_price_cents ?? 0,
    standardDeliveryDays: offer.standard_delivery_days,
    status: offer.offer_status,
    currencyCode: offer.currency_code ?? "EUR",
  },
});

const [submitIntent, setSubmitIntent] = useState<"publish" | "draft" | null>(
  null,
);

const [loadingButton, setLoadingButton] = useState<"publish" | "draft" | null>(
  null,
);

function onSubmit(values: OfferFormValues) {
  const nextStatus =
    submitIntent === "publish"
      ? "active"
      : submitIntent === "draft"
        ? "draft"
        : values.status; // fallback if user hits Enter key

  startTransition(() => {
    updateOfferAction({
      ...values,
      status: nextStatus,
      offerId: offer.id,
    });
  });
}


const status = form.watch("status") ?? offer.offer_status;
const isActive = status === "active";

function handleToggleStatus() {
  const nextStatus = isActive ? "draft" : "active";

  // Immediate UI update
  form.setValue("status", nextStatus);

  // Persist to DB via the same action
  startTransition(() => {
    const values = form.getValues(); // current form values (title, desc, etc.)

    updateOfferAction({
      ...values,
      status: nextStatus,
      offerId: offer.id,
    });
  });
}

const [categoryOpen, setCategoryOpen] = useState(false);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">  
        
        <FieldGroup className="flex flex-col gap-6">
          <FieldSet>
          <FieldLegend>Edit your offer</FieldLegend>
            <FieldDescription>
              You can edit all details of your offer below. Remember to save your changes.
            </FieldDescription>
          </FieldSet>
          <Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
      <Input
        {...field}
        id={field.name}
        aria-invalid={fieldState.invalid}
        placeholder="I will design a high-converting landing page"
        autoComplete="off"
      />
      <FieldDescription>
        This title will appear on your public offer page and in search.
      </FieldDescription>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>


          {/* Description */}
<Controller
  name="description"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field
      orientation="vertical"
      data-invalid={fieldState.invalid}
    >
      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
      <Textarea
        id={field.name}
        rows={5}
        placeholder="Describe what you offer, your process, and what the client gets."
        {...field}
        aria-invalid={fieldState.invalid}
      />
      <FieldDescription>
        A clear, specific description increases conversions.
      </FieldDescription>
      {fieldState.invalid && (
        <FieldError errors={[fieldState.error]} />
      )}
    </Field>
  )}
/>

{/* Category (Combobox) */}
<Controller
  name="categoryId"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field
      orientation="vertical"
      data-invalid={fieldState.invalid}
    >
      <FieldLabel htmlFor={field.name}>Category</FieldLabel>

      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
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
              ? categories.find((cat) => cat.id === field.value)?.name ??
                "Unknown category"
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

</ FieldGroup>
        {/* TODO for later:
            - startingPrice (number)
            - standardDeliveryDays (number)
            - tags (comma-separated Input)
        */}

        <div className="flex flex-wrap items-center gap-3">
  {/* Primary: Publish */}
 <Button
  type="submit"
  disabled={isPending}
  className="flex items-center gap-2"
  onClick={() => {
    setSubmitIntent("publish");
    setLoadingButton("publish");
  }}
>
  {loadingButton === "publish" && isPending && (
    <Spinner className="h-4 w-4" />
  )}
  {loadingButton === "publish" && isPending ? "Publishing..." : "Publish offer"}
</Button>

  {/* Secondary: Save as draft */}
  <Button
  type="submit"
  variant="outline"
  disabled={isPending}
  onClick={() => {
    setSubmitIntent("draft");
    setLoadingButton("draft");
  }}
>
  {loadingButton === "draft" && isPending && (
    <Spinner className="h-4 w-4" />
  )} {loadingButton === "draft" && isPending ? "Saving..." : "Save as draft"}
</Button>

</div>

      </form>
    </Form>
  );
}
