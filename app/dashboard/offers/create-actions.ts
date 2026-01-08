"use server";

import { redirect } from "next/navigation";

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
    throw new Error("Failed to create offer");
  }

  redirect(`/dashboard/offers/${offerId}`);
}
