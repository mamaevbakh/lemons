import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

function computeOnboardingStatus(account: Stripe.Account):
  | "complete"
  | "pending_verification"
  | "pending"
  | "not_connected" {
  if (!account) return "not_connected";
  if (account.charges_enabled && account.payouts_enabled) return "complete";
  if (account.details_submitted) return "pending_verification";
  return "pending";
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", auth.user.id)
      .single();

    if (profileError) {
      console.error("Stripe status sync: failed to load profile", profileError);
      return NextResponse.json(
        { error: "Unable to load profile" },
        { status: 500 },
      );
    }

    if (!profile?.stripe_account_id) {
      await supabase
        .from("profiles")
        .update({
          stripe_onboarding_status: "not_connected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.user.id);

      return NextResponse.json({ status: "not_connected" });
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const status = computeOnboardingStatus(account);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_onboarding_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (updateError) {
      console.error("Stripe status sync: failed to update profile", updateError);
      return NextResponse.json(
        { error: "Unable to update status" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status,
      stripe_account_id: profile.stripe_account_id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (err) {
    console.error("Stripe status sync error", err);

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 },
      );
    }

    return NextResponse.json(
      { error: "Unable to sync Stripe status" },
      { status: 500 },
    );
  }
}
