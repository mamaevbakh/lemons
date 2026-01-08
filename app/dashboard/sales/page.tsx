import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function DashboardSalesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  // Dashboard layout already gates auth, but keep this page resilient.
  if (!user) {
    return (
      <div className="p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sales</EmptyTitle>
            <EmptyDescription>Please sign in.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, status, fulfillment_status, amount_total, currency, created_at, delivered_at",
    )
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("dashboard/sales: load failed", error);
    return (
      <div className="p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sales</EmptyTitle>
            <EmptyDescription>Unable to load your sales.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No sales yet</EmptyTitle>
            <EmptyDescription>
              When customers buy your offers, orders will appear here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Sales</h1>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/dashboard/sales/${order.id}`}
            className="block"
          >
            <Card className="hover:bg-muted/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-4">
                  <span className="truncate">Order</span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex items-center justify-between gap-4">
                <span className="whitespace-nowrap">
                  {order.status}
                  {order.fulfillment_status ? ` · ${order.fulfillment_status}` : ""}
                </span>
                <span className="whitespace-nowrap">
                  {order.amount_total ?? "—"} {order.currency ?? ""}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
