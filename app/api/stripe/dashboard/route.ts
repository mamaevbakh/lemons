import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_account_id) {
    return NextResponse.json(
      { error: "No Stripe account connected" },
      { status: 400 }
    );
  }

  // Create a login link for the Express Dashboard
  const loginLink = await stripe.accounts.createLoginLink(
    profile.stripe_account_id
  );

  return NextResponse.json({ url: loginLink.url });
}
