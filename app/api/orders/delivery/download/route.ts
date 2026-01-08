import { NextResponse } from "next/server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

function extractManifestPaths(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  const out = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const path = (item as Record<string, unknown>).path;
    if (typeof path === "string" && path.trim()) out.add(path);
  }
  return out;
}

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId")?.trim();
  const path = url.searchParams.get("path")?.trim();

  if (!orderId || !path) {
    return NextResponse.json({ error: "Missing orderId or path" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load order and verify user is buyer or seller.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, delivery_manifest")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("download: order lookup failed", orderError);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isBuyerOrSeller = order.buyer_id === user.id || order.seller_id === user.id;
  if (!isBuyerOrSeller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedPaths = extractManifestPaths(order.delivery_manifest);
  if (!allowedPaths.has(path)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from("deliveries")
    .createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    console.error("download: sign failed", error);
    return NextResponse.json({ error: "Failed to sign download" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
