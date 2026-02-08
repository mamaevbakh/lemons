import type { Database } from "@/lib/supabase/types";

export type SubscriptionTier = Database["public"]["Enums"]["subscription_tier"];

/**
 * Stripe product & price IDs for each subscription tier.
 * Free tier has no Stripe product — it's the default.
 */
export const SUBSCRIPTION_PLANS = {
  pro: {
    name: "Lemons Pro",
    productId: "prod_TwUM6VVajNtuH9",
    prices: {
      monthly: {
        id: "price_1SybO5Lw8Lwnp58jGGjhOuXS",
        amount: 1900,
        interval: "month" as const,
        label: "$19/month",
      },
      yearly: {
        id: "price_1SybO4Lw8Lwnp58jU42GdUXv",
        amount: 19000,
        interval: "year" as const,
        label: "$190/year",
      },
    },
  },
  business: {
    name: "Lemons Business",
    productId: "prod_TwUMgmgvQoRaHe",
    prices: {
      monthly: {
        id: "price_1SybO6Lw8Lwnp58jY4cY29QU",
        amount: 4900,
        interval: "month" as const,
        label: "$49/month",
      },
      yearly: {
        id: "price_1SybO9Lw8Lwnp58jJBeLHoh6",
        amount: 49000,
        interval: "year" as const,
        label: "$490/year",
      },
    },
  },
} as const;

/** All valid Stripe price IDs for subscription checkout */
const ALL_PRICE_IDS: Set<string> = new Set([
  SUBSCRIPTION_PLANS.pro.prices.monthly.id,
  SUBSCRIPTION_PLANS.pro.prices.yearly.id,
  SUBSCRIPTION_PLANS.business.prices.monthly.id,
  SUBSCRIPTION_PLANS.business.prices.yearly.id,
]);

export function isValidSubscriptionPriceId(priceId: string): boolean {
  return ALL_PRICE_IDS.has(priceId);
}

/** Map a Stripe product ID back to its tier */
export function tierFromProductId(
  productId: string,
): SubscriptionTier | null {
  if (productId === SUBSCRIPTION_PLANS.pro.productId) return "pro";
  if (productId === SUBSCRIPTION_PLANS.business.productId) return "business";
  return null;
}

/** Map a Stripe price ID back to its tier */
export function tierFromPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (
      plan.prices.monthly.id === priceId ||
      plan.prices.yearly.id === priceId
    ) {
      return tier as SubscriptionTier;
    }
  }
  return null;
}
