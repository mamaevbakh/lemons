import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const UpdateCaseSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    summary: z.string().max(2000).nullable().optional(),
    problem: z.string().max(4000).nullable().optional(),
    solution: z.string().max(4000).nullable().optional(),
    result: z.string().max(4000).nullable().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.summary !== undefined ||
      v.problem !== undefined ||
      v.solution !== undefined ||
      v.result !== undefined,
    { message: "Provide at least one field to update" },
  );

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("cases")
    .select("id, owner_profile_id")
    .eq("id", caseId)
    .maybeSingle();

  if (existingError) {
    console.error("cases:update lookup failed", existingError);
    return NextResponse.json({ error: "Failed to load case" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (existing.owner_profile_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch = parsed.data;

  const { data, error } = await supabase
    .from("cases")
    .update({
      title: patch.title,
      summary: patch.summary,
      problem: patch.problem,
      solution: patch.solution,
      result: patch.result,
    })
    .eq("id", caseId)
    .select("id, title, summary, problem, solution, result, created_at")
    .single();

  if (error || !data) {
    console.error("cases:update failed", error);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }

  return NextResponse.json({ case: data });
}
