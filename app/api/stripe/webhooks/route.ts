import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { tierFromProductId } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

// Use service role for webhooks (no user auth context)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type OrderStatus = "pending" | "paid" | "failed";

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.length) return value;
  return null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function computeOnboardingStatus(account: Stripe.Account):
  | "complete"
  | "pending_verification"
  | "pending" {
  if (account.charges_enabled && account.payouts_enabled) {
    return "complete";
  }
  if (account.details_submitted) {
    return "pending_verification";
  }
  return "pending";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event | undefined;

  // Two webhook destinations share this endpoint:
  //   1. STRIPE_WEBHOOK_SECRET         — Connect events (account.updated, capability.updated)
  //   2. STRIPE_WEBHOOK_SECRET_ACCOUNT  — Your-account events (subscriptions, checkout, invoices)
  // Try both secrets to verify the signature.
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET_ACCOUNT,
    process.env.STRIPE_WEBHOOK_SECRET,
  ].filter(Boolean) as string[];

  let verified = false;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
      verified = true;
      break;
    } catch {
      // Try next secret
    }
  }

  if (!verified || !event) {
    console.error("Webhook signature verification failed against all secrets");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Accounts v1 and v2 compatibility:
  // - v1: account.updated
  // - v2: v2.core.account.updated, v2.core.account.requirements.updated, v2.core.account[requirements].updated
  // We treat any of these as a signal to recompute cached onboarding status.
  const eventType = event.type as string;
  const isAccountUpdateEvent =
    eventType === "account.updated" ||
    eventType === "v2.core.account.updated" ||
    eventType === "v2.core.account.requirements.updated" ||
    eventType === "v2.core.account[requirements].updated";

  const isCapabilityUpdateEvent = eventType === "capability.updated";

  const isCheckoutCompletedEvent =
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded";

  const isSubscriptionEvent =
    eventType === "customer.subscription.created" ||
    eventType === "customer.subscription.updated" ||
    eventType === "customer.subscription.deleted";

  if (isAccountUpdateEvent || isCapabilityUpdateEvent) {
    // account.updated carries an Account object.
    // capability.updated carries a Capability object; in that case, retrieve the account.
    let accountId: string | null = null;
    let account: Stripe.Account | null = null;

    if (isAccountUpdateEvent) {
      account = event.data.object as Stripe.Account;
      accountId = account.id;
    } else {
      const capability = event.data.object as Stripe.Capability;
      accountId = typeof capability.account === "string" ? capability.account : null;
      if (accountId) {
        account = await stripe.accounts.retrieve(accountId);
      }
    }

    if (account && accountId) {
      const status = computeOnboardingStatus(account);

      const { error } = await supabase
        .from("profiles")
        .update({
          stripe_onboarding_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", accountId);

      if (error) {
        console.error("Failed to update profile from webhook", error);
      }
    }
  }

  if (isCheckoutCompletedEvent) {
    const session = event.data.object as Stripe.Checkout.Session;

    const sessionId = session.id;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : firstString(session.payment_intent?.id);

    const metadata = (session.metadata ?? {}) as Record<string, unknown>;
    const offerId = firstString(metadata.offer_id);
    const packageId = firstString(metadata.package_id);
    const sellerId = firstString(metadata.seller_id);
    const buyerId = firstString(metadata.buyer_id);
    const buyerEmail =
      firstString(metadata.buyer_email) ??
      (typeof session.customer_details?.email === "string"
        ? session.customer_details.email
        : typeof session.customer_email === "string"
          ? session.customer_email
          : null);

    const amountTotal =
      coerceNumber(session.amount_total) ??
      coerceNumber(session.amount_subtotal) ??
      null;
    const currency = typeof session.currency === "string" ? session.currency.toUpperCase() : null;

    // We set application_fee_amount on the PaymentIntent, not necessarily on the Checkout Session.
    // Retrieve the PaymentIntent to store platform fee (optional) and to confirm it succeeded.
    let platformFeeAmount: number | null = null;
    let status: OrderStatus = "paid";

    if (paymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        status = pi.status === "succeeded" ? "paid" : "pending";
        platformFeeAmount =
          typeof pi.application_fee_amount === "number" ? pi.application_fee_amount : null;
      } catch (err) {
        console.error("Webhook: failed to retrieve payment_intent", err);
        status = "paid";
      }
    }

    if (!offerId || !packageId || !sellerId) {
      console.error("Webhook: checkout session missing required metadata", {
        sessionId,
        offerId,
        packageId,
        sellerId,
      });
    } else {
      // Idempotent insert by checkout session id.
      const { data: existing, error: existingError } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();

      if (existingError) {
        console.error("Webhook: failed to check existing order", existingError);
      }

      if (!existing) {
        const { error } = await supabase.from("orders").insert({
          offer_id: offerId,
          package_id: packageId,
          seller_id: sellerId,
          buyer_id: buyerId,
          buyer_email: buyerEmail,
          status,
          currency,
          amount_total: amountTotal,
          platform_fee_amount: platformFeeAmount,
          stripe_checkout_session_id: sessionId,
          stripe_payment_intent_id: paymentIntentId,
        });

        if (error) {
          console.error("Webhook: failed to insert order", error);
        }
      } else {
        // Best-effort update to keep it fresh (e.g. async payments).
        const { error } = await supabase
          .from("orders")
          .update({
            status,
            currency,
            amount_total: amountTotal,
            platform_fee_amount: platformFeeAmount,
            buyer_email: buyerEmail,
            buyer_id: buyerId,
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", existing.id);

        if (error) {
          console.error("Webhook: failed to update order", error);
        }
      }
    }
  }

  // ── Subscription lifecycle events ──────────────────────────────
  if (isSubscriptionEvent) {
    const subscription = event.data.object as Stripe.Subscription;
    const supabaseUserId =
      firstString(subscription.metadata?.supabase_user_id) ?? null;

    if (!supabaseUserId) {
      console.error(
        "Webhook: subscription event missing supabase_user_id metadata",
        { subscriptionId: subscription.id, eventType },
      );
    } else {
      // Determine the new tier from the subscription's product
      let newTier: SubscriptionTier = "free";

      if (
        subscription.status === "active" ||
        subscription.status === "trialing"
      ) {
        const item = subscription.items?.data?.[0];
        const productId =
          typeof item?.price?.product === "string"
            ? item.price.product
            : null;

        if (productId) {
          newTier = tierFromProductId(productId) ?? "free";
        }
      }
      // If canceled or incomplete → tier falls back to "free"

      // Map Stripe status to our enum
      const statusMap: Record<string, Database["public"]["Enums"]["subscription_status"]> = {
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        trialing: "trialing",
        incomplete: "incomplete",
        incomplete_expired: "incomplete",
        unpaid: "past_due",
      };
      const subscriptionStatus = statusMap[subscription.status] ?? "incomplete";

      // Read current tier for the audit log
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", supabaseUserId)
        .single();

      const previousTier = (currentProfile?.subscription_tier ?? "free") as SubscriptionTier;

      // Update profile with new subscription state
      const periodEnd = (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_tier: newTier,
          subscription_id: subscription.id,
          subscription_status: subscriptionStatus,
          subscription_current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supabaseUserId);

      if (updateError) {
        console.error("Webhook: failed to update profile subscription", updateError);
      }

      // Insert audit event (idempotent by stripe_event_id)
      const { error: eventError } = await supabase
        .from("subscription_events")
        .insert({
          profile_id: supabaseUserId,
          event_type: eventType,
          stripe_event_id: event.id,
          stripe_subscription_id: subscription.id,
          previous_tier: previousTier,
          new_tier: newTier,
          metadata: {
            stripe_status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
        })
        .select("id")
        .maybeSingle();

      if (eventError) {
        // Unique constraint on stripe_event_id = already processed
        if (!eventError.message?.includes("unique")) {
          console.error("Webhook: failed to insert subscription event", eventError);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
