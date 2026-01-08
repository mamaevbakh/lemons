import { redirect } from "next/navigation";

import { ConnectStripeButton } from "@/components/connect-stripe-button";
import { OpenDashboardButton } from "@/components/open-dashboard-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StripeStatusRefresh } from "@/components/stripe-status-refresh";
import { StripeStatusAutosync } from "@/components/stripe-status-autosync";
import { createClient } from "@/lib/supabase/server";
import { StripeCountryPicker } from "../../../components/stripe-country-picker";

type PayoutsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    redirect("/auth");
  }

  const params = (await searchParams?.catch(() => ({}))) ?? {};
  const getParam = (key: string) => {
    const value = (params as Record<string, string | string[] | undefined>)[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  };
  const returnedFromStripe = getParam("return") === "1";
  const refreshedFromStripe = getParam("refresh") === "1";

  const { data: profile } = await supabase
    .from("profiles")
    .select("country, stripe_account_id, stripe_onboarding_status")
    .eq("id", auth.user.id)
    .single();

  // We handle auto-sync after redirect via a small client component.

  const status = profile?.stripe_onboarding_status;
  const isComplete = status === "complete";
  const isPending = status === "pending" || status === "pending_verification";
  const hasStripeAccount = Boolean(profile?.stripe_account_id);
  const hasCountry = Boolean(profile?.country);

  const statusBadge = () => {
    if (isComplete) return { label: "Active", variant: "default" as const };
    if (status === "pending_verification")
      return { label: "Verifying", variant: "secondary" as const };
    if (isPending) return { label: "Incomplete", variant: "outline" as const };
    return { label: "Not connected", variant: "outline" as const };
  };

  const badge = statusBadge();

  const shouldAutosync = (returnedFromStripe || refreshedFromStripe) && hasStripeAccount;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">
          {isComplete
            ? "Manage your payouts and view your Stripe dashboard."
            : "Connect Stripe to receive payouts for your offers."}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Stripe Connect</CardTitle>
            <CardDescription>
              {isComplete
                ? "Your account is set up and ready to receive payouts."
                : "Start onboarding to receive payouts directly to your account."}
            </CardDescription>
          </div>

          <Badge variant={badge.variant}>{badge.label}</Badge>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {isComplete
              ? "View your balance, payouts, and tax documents in the Stripe Express Dashboard."
              : hasStripeAccount
                ? "Finish your Stripe onboarding to enable payouts. You can resume where you left off."
                : "You'll be redirected to Stripe to securely complete onboarding."}
          </div>

          {isComplete ? (
            <OpenDashboardButton />
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <StripeStatusAutosync enabled={shouldAutosync} />
              <StripeCountryPicker
                initialCountry={profile?.country ?? null}
                locked={hasStripeAccount}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <ConnectStripeButton
                  hasAccountId={hasStripeAccount}
                  disabled={!hasCountry}
                />
                {hasStripeAccount ? <StripeStatusRefresh /> : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
