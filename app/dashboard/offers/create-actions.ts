"use server";

import { redirect } from "next/navigation";

import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { createClient } from "@/lib/supabase/server";

export async function createOfferAction() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  await ensureProfileExists(supabase, user);

  const { count: existingOffersCount, error: countError } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", user.id);

  if (countError) {
    console.error("offers count query failed", countError);
    throw new Error("Failed to validate offer limits");
  }

  const isFirstOffer = (existingOffersCount ?? 0) === 0;

  // Check subscription tier limits
  let canCreate = true;
  if (!isFirstOffer) {
    const { data, error: limitError } = await supabase.rpc("can_create_offer", {
      user_id: user.id,
    });

    if (limitError) {
      console.error("can_create_offer RPC error", limitError);
      throw new Error("Failed to check subscription limits");
    }

    canCreate = Boolean(data);
  }

  if (!canCreate) {
    throw new Error(
      "You've reached the offer limit for your current plan. Upgrade to create more offers.",
    );
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (categoryError) {
    console.error(categoryError);
    throw new Error("Failed to load categories");
  }

  if (!category) {
    throw new Error("No categories exist. Create a category first.");
  }

  const offerId = crypto.randomUUID();
  const title = "New offer";
  const description =
    "Describe your offer in detail so buyers know what to expect.";

  const { error: insertError } = await supabase.from("offers").insert({
    id: offerId,
    creator_id: user.id,
    title,
    description,
    category_id: category.id,
    tags: [],
    offer_status: "draft",
    currency_code: "EUR",
    slug: `new-offer-${offerId.slice(0, 8)}`,
    standard_delivery_days: 7,
  });

  if (insertError) {
    console.error(insertError);
    throw new Error(`Failed to create offer: ${insertError.message}`);
  }

  redirect(`/dashboard/offers/${offerId}`);
}
