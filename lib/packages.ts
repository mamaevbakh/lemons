// lib/packages.ts
import { createClient } from "@/lib/supabase/server";
import {
  PackageFormSchema,
  type PackageFormValues,
} from "@/lib/validation/package-form";

type UpdatePackageInput = {
  userId: string;
  data: PackageFormValues;
};

const PartialPackageFormSchema = PackageFormSchema.partial();

export async function updatePackage({ userId, data }: UpdatePackageInput) {
  const parsed = PartialPackageFormSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("Invalid package update payload");
  }

  const { id, name, description, priceCents, deliveryDays, revisions } =
    parsed.data;

  if (!id) {
    throw new Error("Package id is required");
  }

  const supabase = await createClient();

  // TODO later: join offers table and enforce creator_id = userId for proper auth
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updatePayload.name = name;
  if (description !== undefined) updatePayload.description = description;
  if (priceCents !== undefined) updatePayload.price_cents = priceCents;
  if (deliveryDays !== undefined) updatePayload.delivery_days = deliveryDays;
  if (revisions !== undefined) updatePayload.revisions = revisions;

  const { data: updated, error } = await supabase
    .from("packages")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("updatePackage error", error);
    throw new Error("Failed to update package");
  }

  // Trigger already recomputes offer aggregates after update via trigger
  return updated;
}
