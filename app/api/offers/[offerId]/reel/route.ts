import { NextResponse } from "next/server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const BUCKET = "offer-media";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = new Set([
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

async function getReelMediaForOffer(offerId: string) {
  const { data: links, error: linkError } = await supabaseAdmin
    .from("offer_media")
    .select("id, media_id")
    .eq("offer_id", offerId)
    .eq("role", "reel")
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

async function assertCanAccessReel(offerId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, offer_status, creator_id")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) {
    return { allowed: false, status: 500, error: "Failed to load offer" } as const;
  }

  if (!offer) {
    return { allowed: false, status: 404, error: "Offer not found" } as const;
  }

  // Public access for active offers.
  if (offer.offer_status === "active") {
    return { allowed: true, offer } as const;
  }

  // Draft access only for the owner.
  if (!user) {
    return { allowed: false, status: 401, error: "Unauthorized" } as const;
  }

  if (offer.creator_id !== user.id) {
    return { allowed: false, status: 403, error: "Forbidden" } as const;
  }

  return { allowed: true, offer, user } as const;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await ctx.params;
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") === "1";
  const expiresIn = Math.min(
    Math.max(Number(url.searchParams.get("expiresIn") ?? "3600"), 60),
    60 * 60 * 24,
  );

  const access = await assertCanAccessReel(offerId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const reel = await getReelMediaForOffer(offerId);
  if ("error" in reel) {
    console.error("offers/reel: load failed", reel.error);
    return NextResponse.json({ error: "Failed to load reel" }, { status: 500 });
  }

  if (!reel.media) {
    return NextResponse.json({ error: "No reel" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(reel.media.bucket)
    .createSignedUrl(reel.media.path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("offers/reel: sign failed", error);
    return NextResponse.json({ error: "Failed to sign reel" }, { status: 500 });
  }

  if (redirect) {
    return NextResponse.redirect(data.signedUrl);
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    mimeType: reel.media.mime_type,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await ctx.params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership.
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, creator_id")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) {
    console.error("offers/reel: offer lookup failed", offerError);
    return NextResponse.json({ error: "Failed to load offer" }, { status: 500 });
  }

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  if (offer.creator_id !== user.id) {
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

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `File too large (max ${Math.floor(
          MAX_FILE_SIZE_BYTES / (1024 * 1024),
        )}MB)`,
      },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return NextResponse.json(
      { error: "Unsupported video type" },
      { status: 400 },
    );
  }

  // Remove existing reel (best-effort cleanup).
  const existing = await getReelMediaForOffer(offerId);
  if (!("error" in existing) && existing.link && existing.media) {
    const oldBucket = existing.media.bucket;
    const oldPath = existing.media.path;

    await supabaseAdmin
      .from("offer_media")
      .delete()
      .eq("offer_id", offerId)
      .eq("role", "reel");

    await supabaseAdmin
      .from("media_objects")
      .delete()
      .eq("id", existing.media.id);

    const { error: storageDelErr } = await supabaseAdmin.storage
      .from(oldBucket)
      .remove([oldPath]);

    if (storageDelErr) {
      // not fatal; avoids blocking upload if storage cleanup fails
      console.warn("offers/reel: old storage cleanup failed", storageDelErr);
    }
  }

  const safeName = sanitizeFilename(file.name || "reel");
  const storagePath = `offers/${offerId}/reel/${crypto.randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    console.error("offers/reel: upload failed", uploadError);
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
    console.error("offers/reel: media_objects insert failed", mediaInsertError);

    // Best-effort cleanup of storage object.
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);

    return NextResponse.json(
      { error: "Failed to save media metadata" },
      { status: 500 },
    );
  }

  const offerMediaId = crypto.randomUUID();

  const { error: linkInsertError } = await supabaseAdmin
    .from("offer_media")
    .insert({
      id: offerMediaId,
      offer_id: offerId,
      media_id: mediaId,
      role: "reel",
      position: 0,
    });

  if (linkInsertError) {
    console.error("offers/reel: offer_media insert failed", linkInsertError);

    await supabaseAdmin.from("media_objects").delete().eq("id", mediaId);
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);

    return NextResponse.json(
      { error: "Failed to link reel to offer" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, mediaId, offerMediaId });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await ctx.params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, creator_id")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) {
    console.error("offers/reel: offer lookup failed", offerError);
    return NextResponse.json({ error: "Failed to load offer" }, { status: 500 });
  }

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  if (offer.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getReelMediaForOffer(offerId);
  if ("error" in existing) {
    console.error("offers/reel: load failed", existing.error);
    return NextResponse.json({ error: "Failed to load reel" }, { status: 500 });
  }

  if (!existing.link || !existing.media) {
    return NextResponse.json({ ok: true });
  }

  const { error: linkDeleteError } = await supabaseAdmin
    .from("offer_media")
    .delete()
    .eq("offer_id", offerId)
    .eq("role", "reel");

  if (linkDeleteError) {
    console.error("offers/reel: offer_media delete failed", linkDeleteError);
    return NextResponse.json({ error: "Failed to delete reel" }, { status: 500 });
  }

  const { error: mediaDeleteError } = await supabaseAdmin
    .from("media_objects")
    .delete()
    .eq("id", existing.media.id);

  if (mediaDeleteError) {
    console.error("offers/reel: media_objects delete failed", mediaDeleteError);
    // Not fatal for user; the link is gone.
  }

  const { error: storageDelErr } = await supabaseAdmin.storage
    .from(existing.media.bucket)
    .remove([existing.media.path]);

  if (storageDelErr) {
    console.warn("offers/reel: storage cleanup failed", storageDelErr);
  }

  return NextResponse.json({ ok: true });
}
