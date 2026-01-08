import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function DashboardOrdersPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent("/dashboard/orders")}`);
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, amount_total, currency, created_at")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("dashboard/orders: load failed", error);
    // Keep UX minimal: show empty state rather than error page.
    return (
      <div className="p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Orders</EmptyTitle>
            <EmptyDescription>Unable to load your orders.</EmptyDescription>
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
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>
              Your purchases will show up here after checkout.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Orders</h1>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/dashboard/orders/${order.id}`}
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
                <span className="capitalize">{order.status}</span>
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
