import Link from "next/link";
import { Plus, Sparkles, Truck, Percent, BadgeDollarSign } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { cn, formatMXN } from "@/lib/utils";
import {
  deletePromotionAction,
  togglePromotionActiveAction,
} from "@/app/admin/promociones/actions";
import { PROMOTION_TYPE_LABEL } from "@/lib/promotions";

export const metadata = { title: "Promociones" };
export const dynamic = "force-dynamic";

const TYPE_ICON = {
  free_shipping: Truck,
  percent_off: Percent,
  amount_off: BadgeDollarSign,
} as const;

export default async function PromotionsAdminPage() {
  const { supabase } = await requireAdmin();
  const { data: rules } = await supabase
    .from("promotion_rules")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promociones"
        description="Descuentos automáticos que se aplican al carrito del cliente cuando cumplen sus condiciones."
        action={
          <Link
            href="/admin/promociones/nueva"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Nueva promoción
          </Link>
        }
      />

      {(rules?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Aún no hay promociones"
          description="Crea promociones de envío gratis, descuentos por monto o por categoría."
          action={
            <Link
              href="/admin/promociones/nueva"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Plus className="h-4 w-4" /> Nueva promoción
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rules ?? []).map((r) => {
                const Icon = TYPE_ICON[r.type] ?? Sparkles;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs">
                          {PROMOTION_TYPE_LABEL[r.type] ?? r.type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.name}</p>
                    </TableCell>
                    <TableCell>
                      {r.type === "free_shipping"
                        ? "—"
                        : r.type === "percent_off"
                          ? `${Number(r.discount_value)}%`
                          : formatMXN(Number(r.discount_value))}
                    </TableCell>
                    <TableCell>
                      {r.min_subtotal === null
                        ? "—"
                        : formatMXN(Number(r.min_subtotal))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatWindow(r.starts_at, r.ends_at)}
                    </TableCell>
                    <TableCell>
                      {r.active ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="muted">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <form
                          action={togglePromotionActiveAction.bind(
                            null,
                            r.id,
                            !r.active,
                          )}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            {r.active ? "Pausar" : "Activar"}
                          </Button>
                        </form>
                        <Link
                          href={`/admin/promociones/${r.id}`}
                          className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium hover:bg-muted"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deletePromotionAction.bind(null, r.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function formatWindow(starts: string | null, ends: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  if (!starts && !ends) return "Siempre";
  if (starts && !ends) return `Desde ${fmt(starts)}`;
  if (!starts && ends) return `Hasta ${fmt(ends)}`;
  return `${fmt(starts!)} – ${fmt(ends!)}`;
}
