// app/dashboard/offers/[offerId]/save-actions.ts
"use server";

import { redirect } from "next/navigation";
import { OfferWithPackagesSchema } from "@/lib/validation/offer-with-packages";
import { updateOffer } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";

export async function saveOfferAndPackagesAction(input: unknown) {
  const parsed = OfferWithPackagesSchema.safeParse(input);

  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error("Invalid offer + packages payload");
  }

  const { offerId, offer, packages, caseLinks } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const userId = user.id;

  // 1) Update offer (reuses your existing core function)
  await updateOffer({
    offerId,
    userId,
    data: offer,
  });

  // 2) Handle packages (delete + upsert)
  const toDelete = packages.filter((p) => p._deleted && p.id);
  const toUpsert = packages.filter((p) => !p._deleted);

  if (toDelete.length) {
    const { error: delError } = await supabase
      .from("packages")
      .delete()
      .in(
        "id",
        toDelete.map((p) => p.id!),
      );

    if (delError) {
      console.error(delError);
      throw new Error("Failed to delete packages");
    }
    // trigger will recompute offer aggregates
  }

  if (toUpsert.length) {
    // Assign ids for new packages (id is NOT NULL in DB)
    const withIds = toUpsert.map((p) => ({
      ...p,
      id: p.id ?? crypto.randomUUID(),
    }));

    const { error: upsertError } = await supabase
      .from("packages")
      .upsert(
        withIds.map((p) => ({
          id: p.id,
          offer_id: offerId,
          name: p.name,
          description: p.description,
          price_cents: p.priceCents,
          delivery_days: p.deliveryDays,
          revisions: p.revisions,
        })),
        { onConflict: "id" },
      );

    if (upsertError) {
      console.error(upsertError);
      throw new Error("Failed to save packages");
    }
    // trigger recomputes starting_price_cents & standard_delivery_days
  }

  // 3) Offer portfolio case links
  const caseLinksToDelete = (caseLinks ?? []).filter((c) => c._deleted);
  const caseLinksToUpsert = (caseLinks ?? []).filter((c) => !c._deleted);

  if (caseLinksToDelete.length) {
    const { error: delError } = await supabase
      .from("offer_case_links")
      .delete()
      .in(
        "id",
        caseLinksToDelete.map((c) => c.id),
      );

    if (delError) {
      console.error(delError);
      throw new Error("Failed to delete offer case links");
    }
  }

  if (caseLinksToUpsert.length) {
    const { error: upsertError } = await supabase
      .from("offer_case_links")
      .upsert(
        caseLinksToUpsert.map((c, idx) => ({
          id: c.id,
          offer_id: offerId,
          case_id: c.caseId,
          position: idx,
        })),
        { onConflict: "id" },
      );

    if (upsertError) {
      console.error(upsertError);
      throw new Error("Failed to save offer case links");
    }
  }

  // 4) Full refresh of the edit page
  redirect(`/dashboard/offers/${offerId}`);
}
