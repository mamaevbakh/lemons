import { NextResponse } from "next/server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const BUCKET = "case-media";

const MAX_THUMBNAIL_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_GALLERY_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

const ALLOWED_VIDEO_MIME = new Set([
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

function assertRole(role: string): role is "thumbnail" | "gallery" {
  return role === "thumbnail" || role === "gallery";
}

async function assertCaseOwner(caseId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return { allowed: false, status: 401, error: "Unauthorized" } as const;
  }

  const { data: existing, error: existingError } = await supabase
    .from("cases")
    .select("id, owner_profile_id")
    .eq("id", caseId)
    .maybeSingle();

  if (existingError) {
    return { allowed: false, status: 500, error: "Failed to load case" } as const;
  }

  if (!existing) {
    return { allowed: false, status: 404, error: "Case not found" } as const;
  }

  if (existing.owner_profile_id !== user.id) {
    return { allowed: false, status: 403, error: "Forbidden" } as const;
  }

  return { allowed: true, user } as const;
}

async function deleteExistingThumbnail(caseId: string) {
  const { data: existing, error } = await supabaseAdmin
    .from("case_media")
    .select("id, media_id")
    .eq("case_id", caseId)
    .eq("role", "thumbnail")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !existing) return;

  const { data: media } = await supabaseAdmin
    .from("media_objects")
    .select("id, bucket, path")
    .eq("id", existing.media_id)
    .maybeSingle();

  await supabaseAdmin
    .from("case_media")
    .delete()
    .eq("case_id", caseId)
    .eq("role", "thumbnail");

  await supabaseAdmin.from("media_objects").delete().eq("id", existing.media_id);

  if (media?.bucket && media?.path) {
    const { error: storageDelErr } = await supabaseAdmin.storage
      .from(media.bucket)
      .remove([media.path]);

    if (storageDelErr) {
      console.warn("cases/media: thumbnail storage cleanup failed", storageDelErr);
    }
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await ctx.params;
  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role") ?? undefined;
  const expiresIn = Math.min(
    Math.max(Number(url.searchParams.get("expiresIn") ?? "3600"), 60),
    60 * 60 * 24,
  );

  const access = await assertCaseOwner(caseId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const role = roleParam && assertRole(roleParam) ? roleParam : undefined;

  const query = supabaseAdmin
    .from("case_media")
    .select("id, role, position, media_id, media_objects(bucket, path, mime_type)")
    .eq("case_id", caseId)
    .order("role", { ascending: true })
    .order("position", { ascending: true });

  const { data, error } = role ? await query.eq("role", role) : await query;

  if (error) {
    console.error("cases/media: list failed", error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }

  const items = await Promise.all(
    (data ?? []).map(async (row: any) => {
      const media = Array.isArray(row.media_objects)
        ? row.media_objects[0]
        : row.media_objects;

      if (!media?.bucket || !media?.path) {
        return null;
      }

      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from(media.bucket)
        .createSignedUrl(media.path, expiresIn);

      if (signError || !signed?.signedUrl) {
        return null;
      }

      return {
        id: row.id,
        role: row.role,
        position: row.position,
        mediaId: row.media_id,
        mimeType: media.mime_type ?? null,
        signedUrl: signed.signedUrl,
      };
    }),
  );

  return NextResponse.json({ items: items.filter(Boolean) });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await ctx.params;
  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role") ?? "gallery";

  if (!assertRole(roleParam)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const access = await assertCaseOwner(caseId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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

  const mime = file.type || "application/octet-stream";
  const isImage = ALLOWED_IMAGE_MIME.has(mime);
  const isVideo = ALLOWED_VIDEO_MIME.has(mime);

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (roleParam === "thumbnail" && !isImage) {
    return NextResponse.json({ error: "Thumbnail must be an image" }, { status: 400 });
  }

  const maxBytes = roleParam === "thumbnail" ? MAX_THUMBNAIL_BYTES : MAX_GALLERY_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)` },
      { status: 400 },
    );
  }

  if (roleParam === "thumbnail") {
    await deleteExistingThumbnail(caseId);
  }

  const safeName = sanitizeFilename(file.name || roleParam);
  const storagePath = `cases/${caseId}/${roleParam}/${crypto.randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    console.error("cases/media: upload failed", uploadError);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const mediaId = crypto.randomUUID();

  const { error: mediaInsertError } = await supabaseAdmin
    .from("media_objects")
    .insert({
      id: mediaId,
      owner_profile_id: access.user.id,
      bucket: BUCKET,
      path: storagePath,
      mime_type: mime,
      size_bytes: file.size,
    });

  if (mediaInsertError) {
    console.error("cases/media: media_objects insert failed", mediaInsertError);
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "Failed to save media metadata" },
      { status: 500 },
    );
  }

  let position = 0;
  if (roleParam !== "thumbnail") {
    const { data: last } = await supabaseAdmin
      .from("case_media")
      .select("position")
      .eq("case_id", caseId)
      .eq("role", roleParam)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    position = (last?.position ?? -1) + 1;
  }

  const linkId = crypto.randomUUID();

  const { error: linkInsertError } = await supabaseAdmin
    .from("case_media")
    .insert({
      id: linkId,
      case_id: caseId,
      media_id: mediaId,
      role: roleParam,
      position,
    });

  if (linkInsertError) {
    console.error("cases/media: case_media insert failed", linkInsertError);

    await supabaseAdmin.from("media_objects").delete().eq("id", mediaId);
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);

    return NextResponse.json({ error: "Failed to link media" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mediaId, linkId, role: roleParam, position });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await ctx.params;
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("mediaId");

  if (!mediaId) {
    return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });
  }

  const access = await assertCaseOwner(caseId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Find the case_media link and associated media object
  const { data: link, error: linkError } = await supabaseAdmin
    .from("case_media")
    .select("id, media_id, media_objects(id, bucket, path)")
    .eq("case_id", caseId)
    .eq("media_id", mediaId)
    .maybeSingle();

  if (linkError) {
    console.error("cases/media DELETE: lookup failed", linkError);
    return NextResponse.json({ error: "Failed to find media" }, { status: 500 });
  }

  if (!link) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const media = Array.isArray(link.media_objects)
    ? link.media_objects[0]
    : link.media_objects;

  // Delete the case_media link
  const { error: deleteLinkError } = await supabaseAdmin
    .from("case_media")
    .delete()
    .eq("id", link.id);

  if (deleteLinkError) {
    console.error("cases/media DELETE: link delete failed", deleteLinkError);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }

  // Delete the media_objects entry
  const { error: deleteMediaError } = await supabaseAdmin
    .from("media_objects")
    .delete()
    .eq("id", mediaId);

  if (deleteMediaError) {
    console.error("cases/media DELETE: media_objects delete failed", deleteMediaError);
  }

  // Delete from storage
  if (media?.bucket && media?.path) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(media.bucket)
      .remove([media.path]);

    if (storageError) {
      console.warn("cases/media DELETE: storage cleanup failed", storageError);
    }
  }

  return NextResponse.json({ ok: true });
}
