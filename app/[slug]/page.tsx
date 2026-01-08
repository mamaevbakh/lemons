import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { getInitials } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PurchaseButton } from "@/components/purchase/purchase-button";

type Offer = Tables<"offers">;
type Package = Tables<"packages">;
type Profile = Tables<"profiles">;
type Category = Tables<"categories">;

type OfferWithRelations = Offer & {
  packages?: Package[];
  profiles?: Profile | null;
  categories?: Category | null;
};

export default async function OfferPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data, error } = await supabase
  .from("offers")
  .select(`
    *,
    packages(*),
    profiles:creator_id(*),
    categories:category_id(*)
  `)
  .eq("slug", slug)
  .maybeSingle<OfferWithRelations>();


  if (error) console.error(error);  if (!data) {
    console.error(error);
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Offer not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find an offer with this link.
        </p>
      </div>
    );
  }

  const offer = data;

  const startingPrice =
    offer.starting_price_cents != null
      ? `${offer.starting_price_cents / 100} ${offer.currency_code}`
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      {/* Header */}
      <section className="space-y-4">
        <div className="space-y-2">
          {offer.categories?.name ? (
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {offer.categories.name}
            </div>
          ) : null}

          <h1 className="text-3xl font-bold tracking-tight">
            {offer.title}
          </h1>
        </div>

        {offer.description && (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {offer.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {startingPrice && (
            <div>
              <span className="font-medium">Starting from: </span>
              <span>{startingPrice}</span>
            </div>
          )}

          <div className="h-4 border-l border-border" />

          <div>
            <span className="font-medium">Standard delivery: </span>
            <span>{offer.standard_delivery_days} days</span>
          </div>

          {offer.offer_status === "draft" && (
            <Badge variant="outline" className="text-xs">
              Draft
            </Badge>
          )}
        </div>

        {offer.tags && offer.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {offer.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Packages */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Packages</h2>

        <div className="grid gap-4 md:grid-cols-3">
          {offer.packages && offer.packages.length > 0 ? (
            offer.packages.map((pkg) => (
              <Card key={pkg.id} className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    {pkg.name}
                  </CardTitle>
                  <CardDescription>
                    {offer.currency_code} {pkg.price_cents / 100}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2 text-sm">
  <p className="text-muted-foreground">{pkg.description}</p>

  <div className="mt-auto space-y-1 text-xs text-muted-foreground">
    <div>
      <span className="font-medium text-foreground">Delivery:</span>{" "}
      {pkg.delivery_days} days
    </div>
    <div>
      <span className="font-medium text-foreground">Revisions:</span>{" "}
      {pkg.revisions}
    </div>
  </div>

  <div className="mt-4">
    <PurchaseButton
      offerSlug={offer.slug}
      packageId={pkg.id}
      packageName={pkg.name}
      isAuthenticated={Boolean(auth?.user)}
    />
  </div>
</CardContent>
                
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No packages defined for this offer yet.
            </p>
          )}
        </div>
      </section>

      <Separator />

      {/* Creator */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">About the creator</h2>

        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={offer.profiles?.avatar_url ?? ""} />
            <AvatarFallback>
              {getInitials(offer.profiles?.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <div className="text-base font-semibold">
              {offer.profiles?.full_name ?? "Unknown creator"}
            </div>

            {offer.profiles?.headline && (
              <div className="text-sm text-muted-foreground">
                {offer.profiles.headline}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {offer.profiles?.years_of_experience != null && (
                <>
                  {offer.profiles.years_of_experience} years of experience
                  {" · "}
                </>
              )}
              Member since{" "}
              {new Date(offer.profiles?.created_at ?? offer.created_at).getFullYear()}
            </div>

            {offer.profiles?.bio && (
              <p className="mt-2 text-sm text-muted-foreground">
                {offer.profiles.bio}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
