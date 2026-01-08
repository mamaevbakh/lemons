import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId")?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, delivery_message, delivered_at, delivery_manifest")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("manifest: load failed", error);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isBuyerOrSeller = order.buyer_id === user.id || order.seller_id === user.id;
  if (!isBuyerOrSeller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    delivered_at: order.delivered_at,
    delivery_message: order.delivery_message,
    delivery_manifest: order.delivery_manifest,
  });
}
