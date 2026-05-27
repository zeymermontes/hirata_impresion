import { notFound } from "next/navigation";
import { Store, Truck, User, Mail, Phone } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusChanger } from "@/app/admin/pedidos/[id]/_components/status-changer";
import { NotesForm } from "@/app/admin/pedidos/[id]/_components/notes-form";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMXN } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  formatOrderDate,
} from "@/lib/order-status";
import {
  OrderAppliedPromotions,
  parseAppliedPromotions,
} from "@/app/(storefront)/_components/order-promotions";

export const metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type OrderItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  customization: unknown;
  uploaded_file_url: string | null;
  preview_url: string | null;
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: rawItems }, { data: profile }] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, product_name, variant_name, quantity, unit_price, customization, uploaded_file_url, preview_url",
      )
      .eq("order_id", id),
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", order.user_id)
      .maybeSingle(),
  ]);
  const items = (rawItems ?? []) as OrderItem[];

  // Email lives in auth.users — needs service-role to read.
  let customerEmail: string | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(order.user_id);
    customerEmail = data.user?.email ?? null;
  } catch (e) {
    console.error("[admin/pedidos] failed to load customer email:", e);
  }

  let branchInfo: { name: string; address: string; city: string } | null = null;
  if (order.branch_id) {
    const { data: branch } = await supabase
      .from("branches")
      .select("name, address, city")
      .eq("id", order.branch_id)
      .maybeSingle();
    branchInfo = branch ?? null;
  }

  const addr = order.address_snapshot as Record<string, string> | null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Pedido #${order.id.slice(0, 8)}`}
        backHref="/admin/pedidos"
        description={formatOrderDate(order.created_at)}
        action={
          <Badge variant={ORDER_STATUS_BADGE[order.status] ?? "muted"}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Artículos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {items.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 py-3">
                    {i.preview_url ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={i.preview_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="flex-1">
                      <p className="font-medium">{i.product_name}</p>
                      {i.variant_name ? (
                        <p className="text-xs text-muted-foreground">
                          {i.variant_name}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {i.quantity} × {formatMXN(Number(i.unit_price))}
                      </p>
                      {i.uploaded_file_url ? (
                        <a
                          href={i.uploaded_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-primary hover:underline"
                        >
                          Descargar archivo del cliente
                        </a>
                      ) : null}
                      {i.customization &&
                      typeof i.customization === "object" &&
                      Object.keys(i.customization).length > 0 ? (
                        <CustomizationSummary
                          data={i.customization as Record<string, unknown>}
                        />
                      ) : null}
                    </div>
                    <p className="font-semibold">
                      {formatMXN(Number(i.unit_price) * Number(i.quantity))}
                    </p>
                  </li>
                ))}
              </ul>
              {(() => {
                const appliedPromos = parseAppliedPromotions(
                  order.applied_promotions,
                );
                const discount = Number(order.discount_amount ?? 0);
                return (
                  <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                    {appliedPromos.length > 0 ? (
                      <OrderAppliedPromotions applied={appliedPromos} />
                    ) : null}
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatMXN(Number(order.subtotal))}</span>
                      </div>
                      {discount > 0 ? (
                        <div className="flex justify-between text-emerald-700">
                          <span>Descuentos</span>
                          <span className="font-medium">
                            -{formatMXN(discount)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Envío</span>
                        <span>{formatMXN(Number(order.shipping_cost))}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                        <span>Total</span>
                        <span>{formatMXN(Number(order.total))}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.fulfillment === "ship" && addr ? (
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Envío a domicilio</p>
                    <p className="text-muted-foreground">
                      {addr.recipient} — {addr.street} {addr.ext_number ?? ""}
                      {addr.neighborhood ? `, ${addr.neighborhood}` : ""},{" "}
                      {addr.zip} {addr.city}, {addr.state}
                    </p>
                    {addr.phone ? (
                      <p className="text-muted-foreground">Tel: {addr.phone}</p>
                    ) : null}
                  </div>
                </div>
              ) : branchInfo ? (
                <div className="flex items-start gap-3">
                  <Store className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">
                      Recoger en {branchInfo.name}
                    </p>
                    <p className="text-muted-foreground">
                      {branchInfo.address}, {branchInfo.city}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Proveedor:</span>{" "}
                {order.payment_provider ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Estado:</span>{" "}
                {order.payment_status ?? "—"}
              </p>
              {order.payment_id ? (
                <p className="font-mono text-xs text-muted-foreground">
                  ID de pago: {order.payment_id}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas internas</CardTitle>
              <CardDescription>
                Solo visible para el equipo. Útil para indicaciones de
                producción.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotesForm orderId={order.id} initialNotes={order.notes} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>
                  {profile?.full_name ?? (
                    <span className="text-muted-foreground italic">
                      (sin nombre)
                    </span>
                  )}
                </span>
              </p>
              {customerEmail ? (
                <p className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${customerEmail}`}
                    className="hover:text-primary"
                  >
                    {customerEmail}
                  </a>
                </p>
              ) : null}
              {profile?.phone ? (
                <p className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${profile.phone.replace(/\s+/g, "")}`}
                    className="hover:text-primary"
                  >
                    {profile.phone}
                  </a>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChanger
                orderId={order.id}
                currentStatus={order.status}
                currentTrackingNumber={order.tracking_number}
                currentCarrier={order.carrier}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CustomizationSummary({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.length > 0;
    return true;
  });
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid gap-1 rounded-md bg-muted/30 p-2 text-xs">
      {entries.map(([key, value]) => {
        if (key.endsWith("__url")) {
          return (
            <div key={key} className="flex gap-1.5">
              <dt className="text-muted-foreground capitalize">
                {key.slice(0, -"__url".length)}:
              </dt>
              <dd>
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Descargar
                </a>
              </dd>
            </div>
          );
        }
        return (
          <div key={key} className="flex gap-1.5">
            <dt className="text-muted-foreground capitalize">{key}:</dt>
            <dd className="truncate">{String(value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
