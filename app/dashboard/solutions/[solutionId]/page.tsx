import type { JSX } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

import { SolutionEditWizard } from "./solution-edit-wizard";

type Solution = Tables<"solutions">;

type SolutionLink = Tables<"solution_links">;
type SolutionPricingItem = Tables<"solution_pricing_items">;
type SolutionCaseLink = Tables<"solution_case_links">;

type CaseRow = Tables<"cases">;
type OfferRow = Tables<"offers">;

type SolutionMediaJoin = {
  id: string;
  role: string;
  position: number;
  media_id: string;
  media_objects:
    | {
        bucket: string;
        path: string;
        mime_type: string | null;
      }
    | Array<{
        bucket: string;
        path: string;
        mime_type: string | null;
      }>
    | null;
};

type SolutionRouteParams = {
  solutionId: string;
};

export default function SolutionPage({
  params,
}: {
  params: Promise<SolutionRouteParams>;
}) {
  return <SolutionPageContent params={params} />;
}

async function SolutionPageContent({
  params,
}: {
  params: Promise<SolutionRouteParams>;
}): Promise<JSX.Element> {
  const { solutionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: solution, error: solutionError } = await supabase
    .from("solutions")
    .select("*")
    .eq("id", solutionId)
    .single<Solution>();

  if (solutionError || !solution) {
    notFound();
  }

  const { data: mediaLinks } = await supabase
    .from("solution_media")
    .select("id, role, position, media_id, media_objects(bucket, path, mime_type)")
    .eq("solution_id", solutionId)
    .order("position", { ascending: true });

  const { data: links } = await supabase
    .from("solution_links")
    .select("*")
    .eq("solution_id", solutionId)
    .order("position", { ascending: true });

  const { data: pricingItems } = await supabase
    .from("solution_pricing_items")
    .select("*")
    .eq("solution_id", solutionId)
    .order("position", { ascending: true });

  const { data: caseLinks } = await supabase
    .from("solution_case_links")
    .select("*")
    .eq("solution_id", solutionId)
    .order("position", { ascending: true });

  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, summary, problem, solution, result, created_at")
    .eq("owner_profile_id", user.id)
    .order("created_at", { ascending: false });

  const { data: offers } = await supabase
    .from("offers")
    .select("id, title, offer_status, slug")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">
      <SolutionEditWizard
        solution={solution}
        solutionMedia={(mediaLinks ?? []) as SolutionMediaJoin[]}
        links={(links ?? []) as SolutionLink[]}
        pricingItems={(pricingItems ?? []) as SolutionPricingItem[]}
        caseLinks={(caseLinks ?? []) as SolutionCaseLink[]}
        availableCases={(cases ?? []) as CaseRow[]}
        availableOffers={(offers ?? []) as OfferRow[]}
      />
    </div>
  );
}
