import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliverOrderForm } from "@/components/orders/deliver-order-form";

type Props = {
  params: Promise<{ orderId: string }>;
};

type DeliveryFile = {
  path: string;
  name?: string;
  size?: number;
  mime?: string;
  uploadedAt?: string;
};

function parseDeliveryManifest(value: unknown): DeliveryFile[] {
  if (!Array.isArray(value)) return [];
  const files: DeliveryFile[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const maybePath = (item as Record<string, unknown>).path;
    if (typeof maybePath !== "string" || !maybePath.trim()) continue;

    const name = (item as Record<string, unknown>).name;
    const size = (item as Record<string, unknown>).size;
    const mime = (item as Record<string, unknown>).mime;
    const uploadedAt = (item as Record<string, unknown>).uploadedAt;

    files.push({
      path: maybePath,
      name: typeof name === "string" ? name : undefined,
      size: typeof size === "number" ? size : undefined,
      mime: typeof mime === "string" ? mime : undefined,
      uploadedAt: typeof uploadedAt === "string" ? uploadedAt : undefined,
    });
  }

  return files;
}

export default async function DashboardSaleOrderPage({ params }: Props) {
  const { orderId } = await params;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  // Layout gates auth; keep resilient.
  if (!user) {
    notFound();
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, status, fulfillment_status, amount_total, currency, created_at, buyer_email, delivered_at, delivery_message, delivery_manifest",
    )
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("dashboard/sales: load failed", error);
    notFound();
  }

  if (!order) {
    notFound();
  }

  const deliveryFiles = parseDeliveryManifest(order.delivery_manifest);
  const canDeliver = order.status === "paid" && order.fulfillment_status !== "delivered";

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order</h1>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Payment:</span> {order.status}
          </div>
          <div>
            <span className="text-muted-foreground">Fulfillment:</span>{" "}
            {order.fulfillment_status ?? "unfulfilled"}
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            {order.amount_total ?? "—"} {order.currency ?? ""}
          </div>
          <div>
            <span className="text-muted-foreground">Buyer email:</span>{" "}
            {order.buyer_email ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{" "}
            {new Date(order.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {order.fulfillment_status === "delivered" ? (
        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {order.delivery_message ? <p>{order.delivery_message}</p> : null}
            {order.delivered_at ? (
              <div>
                <span className="text-muted-foreground">Delivered:</span>{" "}
                {new Date(order.delivered_at).toLocaleString()}
              </div>
            ) : null}

            {deliveryFiles.length ? (
              <div className="space-y-2">
                <div className="text-muted-foreground">Files:</div>
                <ul className="list-disc pl-5 space-y-1">
                  {deliveryFiles.map((f) => (
                    <li key={f.path}>
                      <a
                        className="underline"
                        href={`/api/orders/delivery/download?orderId=${encodeURIComponent(
                          order.id,
                        )}&path=${encodeURIComponent(f.path)}`}
                      >
                        {f.name ?? "Download"}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Deliver</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canDeliver ? (
            <p className="text-sm text-muted-foreground">
              {order.status !== "paid"
                ? "You can deliver once the payment is marked as paid."
                : "This order is already delivered."}
            </p>
          ) : null}

          <DeliverOrderForm orderId={order.id} disabled={!canDeliver} />
        </CardContent>
      </Card>
    </div>
  );
}
