import type { JSX } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { OfferEditor } from "./offer-editor";

type Offer = Tables<"offers">;
type Category = Tables<"categories">;

type OfferRouteParams = {
  offerId: string;
};

// 1) Wrapper component – gets params as a Promise (Next 16 style)
export default function OfferPage({
  params,
}: {
  params: Promise<OfferRouteParams>;
}) {
  return <OfferPageContent params={params} />;
}

// 2) Actual async component – unwraps params and fetches data
async function OfferPageContent({
  params,
}: {
  params: Promise<OfferRouteParams>;
}): Promise<JSX.Element> {
  const { offerId } = await params;

  const supabase = await createClient();

  // Fetch offer by ID
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .single<Offer>();

  if (offerError || !offer) {
    // could be "no rows" or RLS
    notFound();
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("*");

  return (
    <div className="p-6">
      <OfferEditor offer={offer} categories={categories as Category[]} />
    </div>
  );
}
