import { NextResponse } from "next/server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function assertCanAccessLinkedCase(solutionId: string, caseId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const { data: solution, error: solutionError } = await supabase
    .from("solutions")
    .select("id, status, owner_id")
    .eq("id", solutionId)
    .maybeSingle();

  if (solutionError) {
    return { allowed: false, status: 500, error: "Failed to load solution" } as const;
  }

  if (!solution) {
    return { allowed: false, status: 404, error: "Solution not found" } as const;
  }

  if (solution.status !== "published") {
    if (!user) {
      return { allowed: false, status: 401, error: "Unauthorized" } as const;
    }
    if (solution.owner_id !== user.id) {
      return { allowed: false, status: 403, error: "Forbidden" } as const;
    }
  }

  const { data: link, error: linkError } = await supabase
    .from("solution_case_links")
    .select("id")
    .eq("solution_id", solutionId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (linkError) {
    return { allowed: false, status: 500, error: "Failed to load case link" } as const;
  }

  if (!link) {
    return { allowed: false, status: 404, error: "Case not linked" } as const;
  }

  return { allowed: true } as const;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ solutionId: string; caseId: string }> },
) {
  const { solutionId, caseId } = await ctx.params;
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") === "1";
  const expiresIn = Math.min(
    Math.max(Number(url.searchParams.get("expiresIn") ?? "3600"), 60),
    60 * 60 * 24,
  );

  const access = await assertCanAccessLinkedCase(solutionId, caseId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: links, error: linkError } = await supabaseAdmin
    .from("case_media")
    .select("id, role, position, media_id, media_objects(bucket, path, mime_type)")
    .eq("case_id", caseId)
    .order("position", { ascending: true })
    .limit(50);

  if (linkError) {
    console.error("solutions/cases/thumbnail: case_media lookup failed", linkError);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }

  const normalized = (links ?? []).map((row: any) => {
    const media = Array.isArray(row.media_objects)
      ? row.media_objects[0]
      : row.media_objects;

    return {
      mediaId: row.media_id as string,
      role: row.role as string,
      position: row.position as number,
      bucket: media?.bucket as string | undefined,
      path: media?.path as string | undefined,
      mimeType: (media?.mime_type as string | null | undefined) ?? null,
    };
  });

  const preferred =
    normalized.find((m) => m.role === "thumbnail" && m.mimeType?.startsWith("image/")) ||
    normalized.find((m) => m.mimeType?.startsWith("image/")) ||
    normalized[0] ||
    null;

  if (!preferred?.mediaId || !preferred.bucket || !preferred.path) {
    return NextResponse.json({ error: "No media" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(preferred.bucket)
    .createSignedUrl(preferred.path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("solutions/cases/thumbnail: sign failed", error);
    return NextResponse.json({ error: "Failed to sign media" }, { status: 500 });
  }

  if (redirect) {
    return NextResponse.redirect(data.signedUrl);
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
