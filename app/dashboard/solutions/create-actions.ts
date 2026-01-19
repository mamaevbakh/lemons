"use server";

import { redirect } from "next/navigation";

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
    throw new Error("Failed to create solution");
  }

  redirect(`/dashboard/solutions/${solutionId}`);
}
