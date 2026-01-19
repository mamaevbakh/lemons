import { NextResponse } from "next/server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const BUCKET = "solution-media";

const MAX_LOGO_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_COVER_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_REEL_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const ALLOWED_COVER_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

const ALLOWED_REEL_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function sanitizeFilename(filename: string) {
  return filename
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replaceAll("..", "_")
    .trim();
}

function assertRole(role: string): role is "logo" | "cover" | "reel" {
  return role === "logo" || role === "cover" || role === "reel";
}

async function getMediaForSolutionRole(
  solutionId: string,
  role: "logo" | "cover" | "reel",
) {
  const { data: links, error: linkError } = await supabaseAdmin
    .from("solution_media")
    .select("id, media_id")
    .eq("solution_id", solutionId)
    .eq("role", role)
    .order("position", { ascending: true })
    .limit(1);

  if (linkError) return { error: linkError } as const;

  const link = links?.[0] ?? null;
  if (!link) return { link: null, media: null } as const;

  const { data: media, error: mediaError } = await supabaseAdmin
    .from("media_objects")
    .select("id, bucket, path, mime_type")
    .eq("id", link.media_id)
    .maybeSingle();

  if (mediaError) return { error: mediaError } as const;

  return { link, media } as const;
}

async function assertCanAccessSolutionMedia(solutionId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const { data: solution, error: solutionError } = await supabase
    .from("solutions")
    .select("id, status, owner_id")
    .eq("id", solutionId)
    .maybeSingle();

  if (solutionError) {
    return {
      allowed: false,
      status: 500,
      error: "Failed to load solution",
    } as const;
  }

  if (!solution) {
    return { allowed: false, status: 404, error: "Solution not found" } as const;
  }

  // Public access for published solutions.
  if (solution.status === "published") {
    return { allowed: true, solution } as const;
  }

  // Draft/archived access only for the owner.
  if (!user) {
    return { allowed: false, status: 401, error: "Unauthorized" } as const;
  }

  if (solution.owner_id !== user.id) {
    return { allowed: false, status: 403, error: "Forbidden" } as const;
  }

  return { allowed: true, solution, user } as const;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ solutionId: string; role: string }> },
) {
  const { solutionId, role } = await ctx.params;
  if (!assertRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") === "1";
  const expiresIn = Math.min(
    Math.max(Number(url.searchParams.get("expiresIn") ?? "3600"), 60),
    60 * 60 * 24,
  );

  const access = await assertCanAccessSolutionMedia(solutionId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const existing = await getMediaForSolutionRole(solutionId, role);
  if ("error" in existing) {
    console.error("solutions/media: load failed", existing.error);
    return NextResponse.json(
      { error: "Failed to load media" },
      { status: 500 },
    );
  }

  if (!existing.media) {
    return NextResponse.json({ error: "No media" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(existing.media.bucket)
    .createSignedUrl(existing.media.path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("solutions/media: sign failed", error);
    return NextResponse.json({ error: "Failed to sign media" }, { status: 500 });
  }

  if (redirect) {
    return NextResponse.redirect(data.signedUrl);
  }

  return NextResponse.json({ signedUrl: data.signedUrl, mimeType: existing.media.mime_type });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ solutionId: string; role: string }> },
) {
  const { solutionId, role } = await ctx.params;
  if (!assertRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership.
  const { data: solution, error: solutionError } = await supabase
    .from("solutions")
    .select("id, owner_id")
    .eq("id", solutionId)
    .maybeSingle();

  if (solutionError) {
    console.error("solutions/media: solution lookup failed", solutionError);
    return NextResponse.json({ error: "Failed to load solution" }, { status: 500 });
  }

  if (!solution) {
    return NextResponse.json({ error: "Solution not found" }, { status: 404 });
  }

  if (solution.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const maxBytes =
    role === "logo"
      ? MAX_LOGO_BYTES
      : role === "cover"
        ? MAX_COVER_BYTES
        : MAX_REEL_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)` },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  const allowed =
    role === "logo"
      ? ALLOWED_LOGO_MIME
      : role === "cover"
        ? ALLOWED_COVER_MIME
        : ALLOWED_REEL_MIME;
  if (!allowed.has(mime)) {
    return NextResponse.json(
      { error: role === "reel" ? "Unsupported video type" : "Unsupported image type" },
      { status: 400 },
    );
  }

  // Remove existing media for this role (best-effort).
  const existing = await getMediaForSolutionRole(solutionId, role);
  if (!("error" in existing) && existing.link && existing.media) {
    const oldBucket = existing.media.bucket;
    const oldPath = existing.media.path;

    await supabaseAdmin
      .from("solution_media")
      .delete()
      .eq("solution_id", solutionId)
      .eq("role", role);

    await supabaseAdmin.from("media_objects").delete().eq("id", existing.media.id);

    const { error: storageDelErr } = await supabaseAdmin.storage
      .from(oldBucket)
      .remove([oldPath]);

    if (storageDelErr) {
      console.warn("solutions/media: old storage cleanup failed", storageDelErr);
    }
  }

  const safeName = sanitizeFilename(file.name || role);
  const storagePath = `solutions/${solutionId}/${role}/${crypto.randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    console.error("solutions/media: upload failed", uploadError);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const mediaId = crypto.randomUUID();

  const { error: mediaInsertError } = await supabaseAdmin
    .from("media_objects")
    .insert({
      id: mediaId,
      owner_profile_id: user.id,
      bucket: BUCKET,
      path: storagePath,
      mime_type: mime,
      size_bytes: file.size,
    });

  if (mediaInsertError) {
    console.error("solutions/media: media_objects insert failed", mediaInsertError);
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);

    return NextResponse.json(
      { error: "Failed to save media metadata" },
      { status: 500 },
    );
  }

  const linkId = crypto.randomUUID();

  const { error: linkInsertError } = await supabaseAdmin
    .from("solution_media")
    .insert({
      id: linkId,
      solution_id: solutionId,
      media_id: mediaId,
      role,
      position: 0,
    });

  if (linkInsertError) {
    console.error("solutions/media: solution_media insert failed", linkInsertError);

    await supabaseAdmin.from("media_objects").delete().eq("id", mediaId);
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);

    return NextResponse.json(
      { error: "Failed to link media" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, mediaId, linkId });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ solutionId: string; role: string }> },
) {
  const { solutionId, role } = await ctx.params;
  if (!assertRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: solution, error: solutionError } = await supabase
    .from("solutions")
    .select("id, owner_id")
    .eq("id", solutionId)
    .maybeSingle();

  if (solutionError) {
    console.error("solutions/media: solution lookup failed", solutionError);
    return NextResponse.json({ error: "Failed to load solution" }, { status: 500 });
  }

  if (!solution) {
    return NextResponse.json({ error: "Solution not found" }, { status: 404 });
  }

  if (solution.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getMediaForSolutionRole(solutionId, role);
  if ("error" in existing) {
    console.error("solutions/media: load failed", existing.error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }

  if (!existing.link || !existing.media) {
    return NextResponse.json({ ok: true });
  }

  const { error: linkDeleteError } = await supabaseAdmin
    .from("solution_media")
    .delete()
    .eq("solution_id", solutionId)
    .eq("role", role);

  if (linkDeleteError) {
    console.error("solutions/media: solution_media delete failed", linkDeleteError);
    return NextResponse.json({ error: "Failed to delete media link" }, { status: 500 });
  }

  const { error: mediaDeleteError } = await supabaseAdmin
    .from("media_objects")
    .delete()
    .eq("id", existing.media.id);

  if (mediaDeleteError) {
    console.error("solutions/media: media_objects delete failed", mediaDeleteError);
  }

  const { error: storageDelErr } = await supabaseAdmin.storage
    .from(existing.media.bucket)
    .remove([existing.media.path]);

  if (storageDelErr) {
    console.warn("solutions/media: storage cleanup failed", storageDelErr);
  }

  return NextResponse.json({ ok: true });
}
