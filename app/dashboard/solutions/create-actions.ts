"use server";

import { redirect } from "next/navigation";

import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { createClient } from "@/lib/supabase/server";

export async function createSolutionAction() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  await ensureProfileExists(supabase, user);

  const { count: existingSolutionsCount, error: countError } = await supabase
    .from("solutions")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    console.error("solutions count query failed", countError);
    throw new Error("Failed to validate solution limits");
  }

  const isFirstSolution = (existingSolutionsCount ?? 0) === 0;

  // Check subscription tier limits
  let canCreate = true;
  if (!isFirstSolution) {
    const { data, error: limitError } = await supabase.rpc(
      "can_create_solution",
      { user_id: user.id },
    );

    if (limitError) {
      console.error("can_create_solution RPC error", limitError);
      throw new Error("Failed to check subscription limits");
    }

    canCreate = Boolean(data);
  }

  if (!canCreate) {
    throw new Error(
      "You've reached the solution limit for your current plan. Upgrade to create more solutions.",
    );
  }

  const solutionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const title = "New solution";
  const headline = "Describe your company in one sentence.";
  const description =
    "Explain what you do, who you help, and what results you deliver.";

  const { error: insertError } = await supabase.from("solutions").insert({
    id: solutionId,
    owner_id: user.id,
    title,
    headline,
    description,
    website_url: null,
    featured_offer_ids: [],
    status: "draft",
    slug: `new-solution-${solutionId.slice(0, 8)}`,
    published_at: null,
    updated_at: now,
  });

  if (insertError) {
    console.error(insertError);
    throw new Error(`Failed to create solution: ${insertError.message}`);
  }

  redirect(`/dashboard/solutions/${solutionId}`);
}
