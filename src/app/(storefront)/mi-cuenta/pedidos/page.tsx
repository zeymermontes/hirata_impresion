import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatMXN } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  formatOrderDate,
} from "@/lib/order-status";

export const metadata = { title: "Mis pedidos" };
export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const { supabase, user } = await requireUser();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, fulfillment, created_at, payment_status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Mis pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Historial de tus compras en Hirata.
        </p>
      </header>

      {(orders?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Package}
          title="Aún no has hecho ningún pedido"
          description="Cuando compres algo, aparecerá aquí."
          action={
            <Link
              href="/productos"
              className={buttonVariants({ variant: "default" })}
            >
              Explorar productos
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile: stack of tappable cards. Better touch targets and no
              horizontal scroll. */}
          <ul className="space-y-2 md:hidden">
            {(orders ?? []).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/mi-cuenta/pedidos/${o.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </p>
                      <Badge variant={ORDER_STATUS_BADGE[o.status] ?? "muted"}>
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatOrderDate(o.created_at)}
                    </p>
                    <p className="pt-1 text-lg font-bold tabular-nums">
                      {formatMXN(Number(o.total))}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: traditional table. */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      #{o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatOrderDate(o.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_BADGE[o.status] ?? "muted"}>
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatMXN(Number(o.total))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/mi-cuenta/pedidos/${o.id}`}
                        className="text-xs font-medium hover:text-primary"
                      >
                        Ver detalle →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
