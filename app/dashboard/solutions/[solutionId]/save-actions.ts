"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { updateSolution } from "@/lib/solutions";
import {
  SolutionEditorDraftSchema,
  SolutionEditorSchema,
  type SolutionEditorDraftValues,
  type SolutionEditorValues,
} from "@/lib/validation/solution-editor";

const UrlSchema = z.string().url();
const SlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i);

function normalizeHttpsUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutScheme = trimmed.replace(/^https?:\/\//i, "");
  if (!withoutScheme) return "";

  return `https://${withoutScheme}`;
}

function isValidUrl(value: string) {
  return UrlSchema.safeParse(value).success;
}

function isValidSlug(value: string) {
  return SlugSchema.safeParse(value).success;
}

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

export async function saveSolutionDraftAction(input: unknown) {
  const parsed = SolutionEditorDraftSchema.safeParse(input);

  if (!parsed.success) {
    console.error(parsed.error.format());
    const messages = parsed.error.issues
      .map((issue) => issue.message)
      .filter(Boolean);

    throw new Error(
      messages.length > 0
        ? `Invalid solution draft payload: ${messages.join(", ")}`
        : "Invalid solution draft payload",
    );
  }

  const { solutionId, solution, links, pricingItems, caseLinks } =
    parsed.data as SolutionEditorDraftValues;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const nextSolutionPatch: Parameters<typeof updateSolution>[0]["data"] = {
    status: "draft",
  };

  if (solution.title !== undefined) {
    const title = solution.title.trim();
    if (title.length >= 3) nextSolutionPatch.title = title;
  }

  if (solution.headline !== undefined) {
    nextSolutionPatch.headline = solution.headline;
  }

  if (solution.description !== undefined) {
    nextSolutionPatch.description = solution.description;
  }

  if (solution.websiteUrl !== undefined) {
    const websiteUrl = normalizeHttpsUrl(solution.websiteUrl);
    if (!websiteUrl) {
      nextSolutionPatch.websiteUrl = "";
    } else if (isValidUrl(websiteUrl)) {
      nextSolutionPatch.websiteUrl = websiteUrl;
    }
  }

  if (solution.slug !== undefined) {
    const slug = solution.slug.trim();
    if (isValidSlug(slug)) {
      nextSolutionPatch.slug = slug;
    }
  }

  if (solution.featuredOfferIds !== undefined) {
    nextSolutionPatch.featuredOfferIds = solution.featuredOfferIds;
  }

  await updateSolution({
    solutionId,
    userId: user.id,
    data: nextSolutionPatch,
  });

  const linksToDelete = links.filter((l) => l._deleted && l.id);
  const linksToUpsert = links
    .filter((l) => !l._deleted && l.id)
    .map((l) => {
      const platform = l.platform?.trim() ?? "";
      const url = normalizeHttpsUrl(l.url ?? "");
      return { id: l.id!, platform, url };
    })
    .filter((l) => l.platform.length > 0 && l.url.length > 0 && isValidUrl(l.url));

  if (linksToDelete.length) {
    const { error } = await supabase
      .from("solution_links")
      .delete()
      .in(
        "id",
        linksToDelete.map((l) => l.id!),
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

  const pricingToDelete = pricingItems.filter((p) => p._deleted && p.id);
  const pricingToUpsert = pricingItems
    .filter((p) => !p._deleted && p.id)
    .map((p) => {
      const title = p.title?.trim() ?? "";
      const priceText = p.priceText?.trim() ?? "";
      const ctaUrl = normalizeHttpsUrl(p.ctaUrl ?? "");
      return {
        id: p.id!,
        title,
        priceText,
        description: p.description?.trim() || null,
        ctaLabel: p.ctaLabel?.trim() || null,
        ctaUrl: ctaUrl && isValidUrl(ctaUrl) ? ctaUrl : null,
      };
    })
    .filter((p) => p.title.length > 0 && p.priceText.length > 0);

  if (pricingToDelete.length) {
    const { error } = await supabase
      .from("solution_pricing_items")
      .delete()
      .in(
        "id",
        pricingToDelete.map((p) => p.id!),
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
        description: p.description,
        cta_label: p.ctaLabel,
        cta_url: p.ctaUrl,
        position: idx,
      })),
      { onConflict: "id" },
    );

    if (error) {
      console.error(error);
      throw new Error("Failed to save pricing items");
    }
  }

  const caseLinksToDelete = caseLinks.filter((c) => c._deleted && c.id);
  const caseLinksToUpsert = caseLinks
    .filter((c) => !c._deleted && c.id && c.caseId)
    .map((c) => ({ id: c.id!, caseId: c.caseId! }));

  if (caseLinksToDelete.length) {
    const { error } = await supabase
      .from("solution_case_links")
      .delete()
      .in(
        "id",
        caseLinksToDelete.map((c) => c.id!),
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
