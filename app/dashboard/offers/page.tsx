import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createOfferAction } from "./create-actions";
import { GatedCreateButton } from "@/components/gated-create-button";
import { Eye, Pencil } from "lucide-react";

export default async function OffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: offers, error }, { data: canCreate }] = await Promise.all([
    supabase
      .from("offers")
      .select(
        "id, title, description, offer_status, starting_price_cents, currency_code, created_at, slug"
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("can_create_offer", { user_id: user!.id }),
  ]);

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load offers.
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Your offers</h1>
          <GatedCreateButton canCreate={canCreate ?? false} entityType="offer" createAction={createOfferAction}>
            Create offer
          </GatedCreateButton>
        </div>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any offers yet. Create your first one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your offers</h1>
        <GatedCreateButton canCreate={canCreate ?? false} entityType="offer" createAction={createOfferAction}>
          Create offer
        </GatedCreateButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className="group flex h-full flex-col rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="line-clamp-1 text-sm font-medium">
                {offer.title}
              </h2>
              <Badge
                variant={
                  offer.offer_status === "active" ? "default" : "outline"
                }
              >
                {offer.offer_status === "active" ? "Active" : "Draft"}
              </Badge>
            </div>

            <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">
              {offer.description ?? "No description yet."}
            </p>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {offer.starting_price_cents != null
                  ? `from ${(offer.starting_price_cents / 100).toFixed(0)} ${
                      offer.currency_code
                    }`
                  : "No price set"}
              </span>
              <span>
                {offer.created_at
                  ? new Date(offer.created_at).toLocaleDateString()
                  : ""}
              </span>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-2 pt-3 border-t">
              {offer.slug && offer.offer_status === "active" ? (
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/${offer.slug}`} target="_blank">
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Preview
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Preview
                </Button>
              )}
              <Button variant="default" size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/offers/${offer.id}`}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
