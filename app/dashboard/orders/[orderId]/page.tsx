import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuyerDelivery } from "@/components/orders/buyer-delivery";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function DashboardOrderPage({ params }: Props) {
  const { orderId } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const user = auth?.user ?? null;
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(`/dashboard/orders/${orderId}`)}`);
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, status, amount_total, currency, offer_id, package_id, created_at",
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("dashboard/orders: load failed", error);
    notFound();
  }

  if (!order) {
    notFound();
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Status:</span> {order.status}
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            {order.amount_total ?? "—"} {order.currency ?? ""}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{" "}
            {new Date(order.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <BuyerDelivery orderId={order.id} />
      </div>
    </div>
  );
}
