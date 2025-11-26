// lib/offers.ts
import { createClient } from "@/lib/supabase/server";
import { OfferFormSchema, type OfferFormValues } from "@/lib/validation/offer-form";

type UpdateOfferInput = {
  offerId: string;
  userId: string;
  data: Partial<OfferFormValues>;
};

const PartialOfferFormSchema = OfferFormSchema.partial();

export async function updateOffer({ offerId, userId, data }: UpdateOfferInput) {
  const parsed = PartialOfferFormSchema.safeParse(data);

  if (!parsed.success) {
    // you can throw a typed error later if you want
    throw new Error("Invalid offer update payload");
  }

  const {
    title,
    description,
    categoryId,
    tags,
    startingPrice,
    standardDeliveryDays,
    status,
    currencyCode,
  } = parsed.data;

  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (categoryId !== undefined) updatePayload.category_id = categoryId;
  if (tags !== undefined) updatePayload.tags = tags;
  if (startingPrice !== undefined) updatePayload.starting_price_cents = startingPrice;
  if (standardDeliveryDays !== undefined)
    updatePayload.standard_delivery_days = standardDeliveryDays;
  if (status !== undefined) updatePayload.offer_status = status;
  if (currencyCode !== undefined) updatePayload.currency_code = currencyCode;

  const { data: updated, error } = await supabase
    .from("offers")
    .update(updatePayload)
    .eq("id", offerId)
    .eq("creator_id", userId) // authorization: can only edit your own offers
    .select("*")
    .single();

  if (error) {
    console.error("updateOffer error", error);
    throw new Error("Failed to update offer");
  }

  return updated;
}
