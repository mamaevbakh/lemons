import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = user.email?.toLowerCase() ?? null;
  if (!userEmail) {
    return NextResponse.json(
      { error: "User email is required" },
      { status: 409 },
    );
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, buyer_email, buyer_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (orderError) {
    console.error("orders/claim: load order failed", orderError);
    return NextResponse.json(
      { error: "Unable to load order" },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 },
    );
  }

  const orderEmail = order.buyer_email?.toLowerCase() ?? null;
  if (!orderEmail) {
    return NextResponse.json(
      { error: "Order is missing buyer email" },
      { status: 409 },
    );
  }

  if (orderEmail !== userEmail) {
    return NextResponse.json(
      { error: "This order belongs to a different email" },
      { status: 403 },
    );
  }

  if (order.buyer_id && order.buyer_id !== user.id) {
    return NextResponse.json(
      { error: "Order is already claimed" },
      { status: 403 },
    );
  }

  if (order.buyer_id !== user.id) {
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ buyer_id: user.id })
      .eq("id", order.id);

    if (updateError) {
      console.error("orders/claim: update order failed", updateError);
      return NextResponse.json(
        { error: "Unable to claim order" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ orderId: order.id });
}
