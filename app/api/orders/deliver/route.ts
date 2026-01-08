import { NextResponse } from "next/server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

function sanitizeFilename(filename: string) {
  // keep simple + predictable; avoid path traversal.
  return filename
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replaceAll("..", "_")
    .trim();
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const orderId = form.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const deliveryMessage = form.get("delivery_message");
  const message = typeof deliveryMessage === "string" ? deliveryMessage.trim() : "";

  const files = [...form.getAll("files[]"), ...form.getAll("files")].filter(
    (v): v is File => v instanceof File,
  );

  if (!files.length) {
    return NextResponse.json({ error: "Please attach at least one file" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES})` }, { status: 400 });
  }

  // Verify seller owns the order and payment is paid.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, seller_id, buyer_id, status, fulfillment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("deliver: order lookup failed", orderError);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { error: "Cannot deliver until payment is marked paid" },
      { status: 400 },
    );
  }

  if (order.fulfillment_status === "delivered") {
    return NextResponse.json({ error: "Order already delivered" }, { status: 400 });
  }

  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10);

  const manifest: Array<{
    path: string;
    name: string;
    size: number;
    mime: string;
    uploadedAt: string;
  }> = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File too large: ${file.name} (max ${Math.floor(
            MAX_FILE_SIZE_BYTES / (1024 * 1024),
          )}MB)`,
        },
        { status: 400 },
      );
    }

    const safeName = sanitizeFilename(file.name || "file");
    const storagePath = `${orderId}/${datePrefix}/${crypto.randomUUID()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const contentType = file.type || "application/octet-stream";

    const { error: uploadError } = await supabaseAdmin.storage
      .from("deliveries")
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("deliver: upload failed", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    manifest.push({
      path: storagePath,
      name: safeName,
      size: file.size,
      mime: contentType,
      uploadedAt: new Date().toISOString(),
    });
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      delivered_at: new Date().toISOString(),
      fulfillment_status: "delivered",
      delivery_message: message || null,
      delivery_manifest: manifest,
    })
    .eq("id", orderId)
    .eq("seller_id", user.id);

  if (updateError) {
    console.error("deliver: order update failed", updateError);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
