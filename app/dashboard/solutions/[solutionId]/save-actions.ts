"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { updateSolution } from "@/lib/solutions";
import {
  SolutionEditorSchema,
  type SolutionEditorValues,
} from "@/lib/validation/solution-editor";

export async function saveSolutionAction(input: unknown) {
  const parsed = SolutionEditorSchema.safeParse(input);

  if (!parsed.success) {
    console.error(parsed.error.format());
    const messages = parsed.error.issues
      .map((issue) => issue.message)
      .filter(Boolean);

    throw new Error(
      messages.length > 0
        ? `Invalid solution payload: ${messages.join(", ")}`
        : "Invalid solution payload",
    );
  }

  const { solutionId, solution, links, pricingItems, caseLinks } =
    parsed.data as SolutionEditorValues;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 1) Update solution
  await updateSolution({
    solutionId,
    userId: user.id,
    data: solution,
  });

  // 2) Links
  const linksToDelete = links.filter((l) => l._deleted);
  const linksToUpsert = links.filter((l) => !l._deleted);

  if (linksToDelete.length) {
    const { error } = await supabase
      .from("solution_links")
      .delete()
      .in(
        "id",
        linksToDelete.map((l) => l.id),
      );

    if (error) {
      console.error(error);
      throw new Error("Failed to delete solution links");
    }
  }

  if (linksToUpsert.length) {
    const { error } = await supabase.from("solution_links").upsert(
      linksToUpsert.map((l, idx) => ({
        id: l.id,
        solution_id: solutionId,
        platform: l.platform,
        url: l.url,
        position: idx,
      })),
      { onConflict: "id" },
    );

    if (error) {
      console.error(error);
      throw new Error("Failed to save solution links");
    }
  }

  // 3) Pricing
  const pricingToDelete = pricingItems.filter((p) => p._deleted);
  const pricingToUpsert = pricingItems.filter((p) => !p._deleted);

  if (pricingToDelete.length) {
    const { error } = await supabase
      .from("solution_pricing_items")
      .delete()
      .in(
        "id",
        pricingToDelete.map((p) => p.id),
      );

    if (error) {
      console.error(error);
      throw new Error("Failed to delete pricing items");
    }
  }

  if (pricingToUpsert.length) {
    const { error } = await supabase.from("solution_pricing_items").upsert(
      pricingToUpsert.map((p, idx) => ({
        id: p.id,
        solution_id: solutionId,
        title: p.title,
        price_text: p.priceText,
        description: p.description ?? null,
        cta_label: p.ctaLabel ?? null,
        cta_url: p.ctaUrl ?? null,
        position: idx,
      })),
      { onConflict: "id" },
    );

    if (error) {
      console.error(error);
      throw new Error("Failed to save pricing items");
    }
  }

  // 4) Case links
  const caseLinksToDelete = caseLinks.filter((c) => c._deleted);
  const caseLinksToUpsert = caseLinks.filter((c) => !c._deleted);

  if (caseLinksToDelete.length) {
    const { error } = await supabase
      .from("solution_case_links")
      .delete()
      .in(
        "id",
        caseLinksToDelete.map((c) => c.id),
      );

    if (error) {
      console.error(error);
      throw new Error("Failed to delete case links");
    }
  }

  if (caseLinksToUpsert.length) {
    const { error } = await supabase.from("solution_case_links").upsert(
      caseLinksToUpsert.map((c, idx) => ({
        id: c.id,
        solution_id: solutionId,
        case_id: c.caseId,
        position: idx,
      })),
      { onConflict: "id" },
    );

    if (error) {
      console.error(error);
      throw new Error("Failed to save case links");
    }
  }

  redirect(`/dashboard/solutions/${solutionId}`);
}
