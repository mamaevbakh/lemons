import { redirect } from "next/navigation";
import { Crown, Check, Gift } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BillingActions } from "./billing-actions";

const plans = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    originalPrice: null,
    description: "Get started with the basics",
    features: [
      "1 solution",
      "1 offer",
      "10% platform fee",
      "Community support",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$0",
    originalPrice: "$19/mo",
    description: "For growing professionals",
    features: [
      "3 solutions",
      "Unlimited offers",
      "7% platform fee",
      "Priority support",
    ],
  },
  {
    tier: "business",
    name: "Business",
    price: "$0",
    originalPrice: "$49/mo",
    description: "For teams and agencies",
    features: [
      "Unlimited solutions",
      "Unlimited offers",
      "5% platform fee",
      "Dedicated support",
      "Custom branding",
    ],
  },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/dashboard/billing");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_status, subscription_period_end, stripe_customer_id",
    )
    .eq("id", user.id)
    .single();

  const currentTier = profile?.subscription_tier ?? "free";
  const status = profile?.subscription_status ?? "none";
  const periodEnd = profile?.subscription_period_end;
  const hasStripeCustomer = !!profile?.stripe_customer_id;
  const isTrial = status === "trialing";

  function getStatusDescription() {
    if (isTrial && periodEnd) {
      return `Free trial · Billing starts ${new Date(periodEnd).toLocaleDateString()}`;
    }
    if (status === "active" && periodEnd) {
      return `Active · Renews ${new Date(periodEnd).toLocaleDateString()}`;
    }
    if (currentTier === "free") {
      return "No active subscription";
    }
    return `Status: ${status}`;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground">
          Manage your plan and billing details
        </p>
      </div>

      {/* Promo banner */}
      {currentTier === "free" && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Gift className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            Launch promo — all paid plans are free for 1 year. Card required, cancel anytime.
          </span>
        </div>
      )}

      {/* Current plan card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>{getStatusDescription()}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTrial && (
                <Badge variant="secondary" className="text-[10px]">
                  Free trial
                </Badge>
              )}
              <Badge
                variant={currentTier === "free" ? "secondary" : "default"}
                className="text-sm"
              >
                {plans.find((p) => p.tier === currentTier)?.name ?? "Free"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {hasStripeCustomer && currentTier !== "free" && (
          <CardContent>
            <BillingActions />
          </CardContent>
        )}
      </Card>

      {/* Plan comparison */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <Card
              key={plan.tier}
              className={
                isCurrent ? "border-primary shadow-md" : "border-muted"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px]">
                      Current
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div>
                  <span className="text-2xl font-bold">{plan.price}</span>
                  {plan.originalPrice && (
                    <>
                      <span className="ml-1 text-sm text-muted-foreground">
                        for 1 year
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        {plan.originalPrice}
                      </span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
