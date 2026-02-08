"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, Loader2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";

type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the user was trying to do when they hit the limit */
  context: "solution" | "offer";
};

const plans = [
  {
    key: "pro" as const,
    name: "Pro",
    description: "For freelancers",
    badge: "Recommended",
    solutions: "3 solution pages",
    offers: "Unlimited offers",
    fee: "7% platform fee",
    extras: ["Priority support"],
  },
  {
    key: "business" as const,
    name: "Business",
    description: "For companies",
    badge: null,
    solutions: "Unlimited solution pages",
    offers: "Unlimited offers",
    fee: "5% platform fee",
    extras: ["Priority support", "Custom branding"],
  },
];

export function UpgradeDialog({
  open,
  onOpenChange,
  context,
}: UpgradeDialogProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "business">("pro");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [isPending, startTransition] = useTransition();
  const [portalPending, startPortalTransition] = useTransition();

  const contextMessages = {
    solution:
      "You've reached the solution limit on your current plan. Pick a plan to unlock more — it's free for a full year!",
    offer:
      "You've reached the offer limit on your current plan. Pick a plan to unlock more — it's free for a full year!",
  };

  async function handleUpgrade() {
    const plan = SUBSCRIPTION_PLANS[selectedPlan];
    const priceId = plan.prices[billingInterval].id;

    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/subscription/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId }),
        });

        const data = await res.json();

        if (data.url) {
          router.push(data.url);
        } else {
          console.error("Checkout error:", data.error);
        }
      } catch (err) {
        console.error("Failed to start checkout:", err);
      }
    });
  }

  async function handleManageSubscription() {
    startPortalTransition(async () => {
      try {
        const res = await fetch("/api/stripe/subscription/portal", {
          method: "POST",
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        console.error("Failed to open portal:", err);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Upgrade your plan
          </DialogTitle>
          <DialogDescription>{contextMessages[context]}</DialogDescription>
        </DialogHeader>

        {/* Promo banner */}
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Gift className="h-4 w-4 shrink-0" />
          <span className="font-medium">Launch promo — free for 1 year, cancel anytime</span>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 rounded-lg border p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              billingInterval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("yearly")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              billingInterval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <Badge variant="secondary" className="ml-1.5 text-[10px]">
              Save ~17%
            </Badge>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid gap-3">
          {plans.map((plan) => {
            const price = SUBSCRIPTION_PLANS[plan.key].prices[billingInterval];
            const isSelected = selectedPlan === plan.key;

            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlan(plan.key)}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/50 hover:border-muted-foreground/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{plan.name}</span>
                      {plan.badge && (
                        <Badge variant="secondary" className="text-[10px]">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {plan.description}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">$0</span>
                    <span className="ml-1.5 text-sm text-muted-foreground line-through">
                      {price.label}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary" />
                    {plan.solutions}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary" />
                    {plan.offers}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary" />
                    {plan.fee}
                  </span>
                  {plan.extras.map((extra) => (
                    <span
                      key={extra}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <Check className="h-3 w-3 text-primary" />
                      {extra}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <Button
          onClick={handleUpgrade}
          disabled={isPending}
          size="lg"
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting to checkout…
            </>
          ) : (
            `Start ${selectedPlan === "pro" ? "Pro" : "Business"} — free for 1 year`
          )}
        </Button>

        <div className="flex items-center justify-center gap-4">
          <p className="text-center text-xs text-muted-foreground">
            Card required. You won&apos;t be charged for 1 year. Cancel anytime.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={handleManageSubscription}
          disabled={portalPending}
        >
          {portalPending ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <ExternalLink className="mr-2 h-3 w-3" />
          )}
          Manage existing subscription
        </Button>
      </DialogContent>
    </Dialog>
  );
}
