// app/dashboard/offers/[offerId]/actions.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { OfferFormSchema } from "@/lib/validation/offer-form";
import { updateOffer } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";

const OfferFormWithIdSchema = OfferFormSchema.extend({
  offerId: z.string().uuid(),
});

export async function updateOfferAction(input: unknown) {
  // 1) Validate payload from client
  const parsed = OfferFormWithIdSchema.safeParse(input);
  if (!parsed.success) {
    // later you can return a structured form state instead of throwing
    throw new Error("Invalid offer form data");
  }

  const { offerId, ...data } = parsed.data;

  // 2) Get current user id
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 3) Call core function
  await updateOffer({
    offerId,
    userId: user.id,
    data,
  });

  // 4) Revalidate UI
  // For v1: just refresh the page segment
  redirect(`/dashboard/offers/${offerId}`);
}
