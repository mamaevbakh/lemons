import type { JSX } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { OfferEditWizard } from "./offer-edit-wizard";

type Offer = Tables<"offers">;
type Category = Tables<"categories">;
type PackageRow = Tables<"packages">;
type OfferCaseLink = Tables<"offer_case_links">;
type CaseRow = Tables<"cases">;

type OfferRouteParams = {
  offerId: string;
};

export default function OfferPage({
  params,
}: {
  params: Promise<OfferRouteParams>;
}) {
  return <OfferPageContent params={params} />;
}

async function OfferPageContent({
  params,
}: {
  params: Promise<OfferRouteParams>;
}): Promise<JSX.Element> {
  const { offerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .single<Offer>();

  if (offerError || !offer) {
    notFound();
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*");

  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("offer_id", offerId)
    .order("price_cents", { ascending: true });

  const { data: offerCaseLinks } = await supabase
    .from("offer_case_links")
    .select("*")
    .eq("offer_id", offerId)
    .order("position", { ascending: true });

  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, summary, problem, solution, result, created_at")
    .eq("owner_profile_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">
      <OfferEditWizard
        offer={offer}
        categories={(categories ?? []) as Category[]}
        packages={(packages ?? []) as PackageRow[]}
        caseLinks={(offerCaseLinks ?? []) as OfferCaseLink[]}
        availableCases={(cases ?? []) as CaseRow[]}
      />
    </div>
  );
}
