import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isValidSubscriptionPriceId } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

type CheckoutBody = {
  priceId: string;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as CheckoutBody | null;
    if (!body?.priceId || !isValidSubscriptionPriceId(body.priceId)) {
      return NextResponse.json(
        { error: "Invalid or missing priceId" },
        { status: 400 },
      );
    }

    // Load profile to get or create stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id, subscription_id, subscription_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 },
      );
    }

    // Don't allow checkout if user already has an active subscription
    if (
      profile.subscription_id &&
      profile.subscription_status === "active"
    ) {
      return NextResponse.json(
        { error: "You already have an active subscription. Use the billing portal to manage it." },
        { status: 409 },
      );
    }

    // Get or create a Stripe customer for this user
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Persist with service role (RLS might block user from updating their own stripe_customer_id)
      const serviceSupabase = createServiceClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      await serviceSupabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const origin = req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: body.priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dashboard?subscription=canceled`,
      subscription_data: {
        trial_period_days: 365,
        metadata: { supabase_user_id: user.id },
      },
      payment_method_collection: "always",
      metadata: { supabase_user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Subscription checkout error", err);

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 },
      );
    }

    return NextResponse.json(
      { error: "Unable to start subscription checkout" },
      { status: 500 },
    );
  }
}
