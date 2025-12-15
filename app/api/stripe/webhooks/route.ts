import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

// Use service role for webhooks (no user auth context)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    // Determine onboarding status based on account state
    let status: string;
    if (account.charges_enabled && account.payouts_enabled) {
      status = "complete";
    } else if (account.details_submitted) {
      status = "pending_verification";
    } else {
      status = "pending";
    }

    // Update profile by stripe_account_id
    const { error } = await supabase
      .from("profiles")
      .update({
        stripe_onboarding_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account.id);

    if (error) {
      console.error("Failed to update profile from webhook", error);
    }
  }

  return NextResponse.json({ received: true });
}
