import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";

// Current Stripe API version as of Dec 2025 is 2025-11-17.clover
// Always use the latest stable API version for new integrations
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

type ProfileWithStripe = {
  stripe_account_id?: string | null;
  stripe_onboarding_status?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = auth.user;
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Stripe connect: failed to load profile", profileError);
      return NextResponse.json(
        { error: "Unable to load profile" },
        { status: 500 },
      );
    }

    const profile = profileData as ProfileWithStripe | null;
    let accountId = profile?.stripe_account_id ?? null;

    if (!accountId) {
      // Create a new connected account using controller properties (recommended approach)
      // See: https://docs.stripe.com/connect/design-an-integration
      const account = await stripe.accounts.create({
        // Using controller properties instead of deprecated 'type' parameter
        controller: {
          fees: { payer: "application" },
          losses: { payments: "application" },
          stripe_dashboard: { type: "express" },
        },
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
        // Request only the capabilities you need to reduce onboarding friction
        // See: https://docs.stripe.com/connect/account-capabilities
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error(
          "Stripe connect: account created but profile update failed",
          updateError,
        );
        return NextResponse.json(
          { error: "Stripe account created, but failed to store it." },
          { status: 500 },
        );
      }
    }

    const origin = req.nextUrl.origin;
    const refreshUrl =
      process.env.STRIPE_CONNECT_REFRESH_URL ??
      `${origin}/dashboard/payouts?refresh=1`;
    const returnUrl =
      process.env.STRIPE_CONNECT_RETURN_URL ??
      `${origin}/dashboard/payouts?return=1`;

    // Create Account Link for Stripe-hosted onboarding
    // See: https://docs.stripe.com/connect/hosted-onboarding
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
      // Use eventually_due for up-front onboarding (collects all requirements at once)
      // Use currently_due for incremental onboarding (faster but may require follow-ups)
      collection_options: {
        fields: "eventually_due",
      },
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("Stripe connect onboarding error", err);

    // Provide more specific error messages for common Stripe errors
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 },
      );
    }

    return NextResponse.json(
      { error: "Unable to start Stripe onboarding" },
      { status: 500 },
    );
  }
}
