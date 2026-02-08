import { Check, Gift } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const plans = [
  {
    name: "Free",
    description: "Try it out, no commitment",
    price: "$0",
    originalPrice: null,
    interval: "forever",
    badge: null,
    features: [
      "1 solution page",
      "1 offer",
      "10% platform fee",
      "Standard support",
    ],
    cta: "Get started",
    ctaVariant: "outline" as const,
    href: "/auth",
    promo: false,
  },
  {
    name: "Pro",
    description: "For freelancers who sell their skills",
    price: "$0",
    originalPrice: "$19/mo",
    interval: "for 1 year",
    badge: "Most popular",
    features: [
      "3 solution pages",
      "Unlimited offers",
      "7% platform fee",
      "Priority support",
    ],
    cta: "Start Pro — free for 1 year",
    ctaVariant: "default" as const,
    href: "/auth",
    promo: true,
  },
  {
    name: "Business",
    description: "For companies and agencies",
    price: "$0",
    originalPrice: "$49/mo",
    interval: "for 1 year",
    badge: null,
    features: [
      "Unlimited solution pages",
      "Unlimited offers",
      "5% platform fee",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start Business — free for 1 year",
    ctaVariant: "outline" as const,
    href: "/auth",
    promo: true,
  },
];

export function PricingSection() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-3xl text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight">
          Simple, transparent pricing
        </h2>
        <p className="mt-4 text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
          <Gift className="h-4 w-4" />
          <span className="font-medium">Launch promo — all paid plans free for 1 year</span>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto items-start">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={
              plan.badge
                ? "relative border-primary shadow-md"
                : "relative"
            }
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>{plan.badge}</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-muted-foreground text-sm ml-1">
                  {plan.interval}
                </span>
                {plan.originalPrice && (
                  <span className="ml-2 text-sm text-muted-foreground line-through">
                    {plan.originalPrice}
                  </span>
                )}
              </div>
              {plan.promo && (
                <p className="text-xs text-muted-foreground mt-1">
                  Then regular price after 1 year. Cancel anytime.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Separator className="mb-6" />
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant={plan.ctaVariant}
                className="w-full"
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
