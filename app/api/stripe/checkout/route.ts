import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

const DEFAULT_PLATFORM_FEE_BPS = 1000; // 10% fallback

type CheckoutBody = {
  offerSlug: string;
  packageId: string;
  buyerEmail?: string;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    const body = (await req.json().catch(() => null)) as CheckoutBody | null;
    if (!body?.offerSlug || !body?.packageId) {
      return NextResponse.json(
        { error: "offerSlug and packageId are required" },
        { status: 400 },
      );
    }

    const buyerId = auth?.user?.id ?? null;
    const buyerEmail = auth?.user?.email || null;

    // Load offer + chosen package + creator profile (seller)
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(
        `
        id,
        slug,
        title,
        currency_code,
        creator_id,
        profiles:creator_id(id, stripe_account_id, stripe_onboarding_status)
      `,
      )
      .eq("slug", body.offerSlug)
      .single();

    if (offerError || !offer) {
      console.error("checkout: offer load failed", offerError);
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("packages")
      .select("id, name, price_cents, offer_id")
      .eq("id", body.packageId)
      .single();

    if (pkgError || !pkg || pkg.offer_id !== offer.id) {
      console.error("checkout: package load failed", pkgError);
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 },
      );
    }

    const sellerStripeAccountId = (offer.profiles as any)?.stripe_account_id as
      | string
      | null
      | undefined;
    const sellerStatus = (offer.profiles as any)?.stripe_onboarding_status as
      | string
      | null
      | undefined;

    if (!sellerStripeAccountId) {
      return NextResponse.json(
        { error: "Seller is not yet connected to Stripe" },
        { status: 409 },
      );
    }

    if (sellerStatus !== "complete") {
      return NextResponse.json(
        { error: "Seller is not ready to accept payments yet" },
        { status: 409 },
      );
    }

    const currency = (offer.currency_code || "EUR").toUpperCase();
    const unitAmount = pkg.price_cents;

    // Get seller's platform fee based on their subscription tier
    const serviceSupabase = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: feeBps } = await serviceSupabase.rpc("get_platform_fee_bps", {
      user_id: offer.creator_id,
    });

    const platformFeeBps = feeBps ?? DEFAULT_PLATFORM_FEE_BPS;
    const feeAmount = Math.round((unitAmount * platformFeeBps) / 10000);

    const origin = req.nextUrl.origin;
    const successUrl =
      process.env.STRIPE_CHECKOUT_SUCCESS_URL ??
      `${origin}/orders/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      process.env.STRIPE_CHECKOUT_CANCEL_URL ?? `${origin}/${offer.slug}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      // For guests, omit customer_email so Stripe Checkout collects it.
      customer_email: buyerId ? buyerEmail ?? undefined : undefined,
      client_reference_id: buyerId ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: `${offer.title} — ${pkg.name}`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: feeAmount,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        metadata: {
          offer_id: offer.id,
          package_id: pkg.id,
          seller_id: offer.creator_id,
          buyer_id: buyerId ?? "",
        },
      },
      metadata: {
        offer_id: offer.id,
        package_id: pkg.id,
        seller_id: offer.creator_id,
        buyer_id: buyerId ?? "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err);

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 },
      );
    }

    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
