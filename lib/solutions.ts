import { createClient } from "@/lib/supabase/server";
import {
  SolutionFormSchema,
  type SolutionFormValues,
} from "@/lib/validation/solution-form";

type UpdateSolutionInput = {
  solutionId: string;
  userId: string;
  data: Partial<SolutionFormValues>;
};

const PartialSolutionFormSchema = SolutionFormSchema.partial();

export async function updateSolution({
  solutionId,
  userId,
  data,
}: UpdateSolutionInput) {
  const parsed = PartialSolutionFormSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("Invalid solution update payload");
  }

  const {
    title,
    headline,
    description,
    websiteUrl,
    slug,
    status,
    featuredOfferIds,
  } = parsed.data;

  const supabase = await createClient();

  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    updated_at: now,
  };

  if (title !== undefined) updatePayload.title = title;
  if (headline !== undefined) updatePayload.headline = headline;
  if (description !== undefined) updatePayload.description = description;
  if (websiteUrl !== undefined) {
    const v = websiteUrl.trim();
    updatePayload.website_url = v.length ? v : null;
  }
  if (slug !== undefined) updatePayload.slug = slug;
  if (status !== undefined) {
    updatePayload.status = status;
    if (status === "published") {
      const { data: existing, error: existingError } = await supabase
        .from("solutions")
        .select("published_at")
        .eq("id", solutionId)
        .eq("owner_id", userId)
        .maybeSingle();

      if (existingError) {
        console.error("updateSolution: load existing published_at failed", existingError);
        throw new Error("Failed to update solution");
      }

      if (!existing?.published_at) {
        updatePayload.published_at = now;
      }
    }
  }
  if (featuredOfferIds !== undefined) {
    updatePayload.featured_offer_ids = featuredOfferIds;
  }

  const { data: updated, error } = await supabase
    .from("solutions")
    .update(updatePayload)
    .eq("id", solutionId)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("updateSolution error", error);
    throw new Error("Failed to update solution");
  }

  return updated;
}
