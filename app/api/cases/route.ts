import { NextResponse } from "next/server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const CreateCaseSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().max(2000).optional().nullable(),
  problem: z.string().max(4000).optional().nullable(),
  solution: z.string().max(4000).optional().nullable(),
  result: z.string().max(4000).optional().nullable(),
});

export async function POST(req: Request) {
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

  const parsed = CreateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();

  const { data, error } = await supabase
    .from("cases")
    .insert({
      id,
      owner_profile_id: user.id,
      title: parsed.data.title,
      summary: parsed.data.summary ?? null,
      problem: parsed.data.problem ?? null,
      solution: parsed.data.solution ?? null,
      result: parsed.data.result ?? null,
    })
    .select("id, title, summary, problem, solution, result, created_at")
    .single();

  if (error || !data) {
    console.error("cases:create failed", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }

  return NextResponse.json({ case: data });
}
