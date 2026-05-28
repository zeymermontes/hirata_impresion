import Link from "next/link";
import { Plus, Ticket, Percent, BadgeDollarSign, Truck } from "lucide-react";
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
  deleteCodeAction,
  toggleCodeActiveAction,
} from "@/app/admin/codigos/actions";
import { DISCOUNT_TYPE_LABEL } from "@/lib/promo-codes";

export const metadata = { title: "Códigos promocionales" };
export const dynamic = "force-dynamic";

const TYPE_ICON = {
  percent: Percent,
  amount: BadgeDollarSign,
  free_shipping: Truck,
} as const;

export default async function CodesAdminPage() {
  const { supabase } = await requireAdmin();
  const { data: codes } = await supabase
    .from("promotions")
    .select(
      "id, code, label, discount_type, value, min_subtotal, starts_at, ends_at, usage_limit, times_used, active",
    )
    .order("active", { ascending: false })
    .order("code", { ascending: true });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Códigos promocionales"
        description="Códigos que el cliente puede escribir en checkout para obtener un descuento."
        action={
          <Link
            href="/admin/codigos/nuevo"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Nuevo código
          </Link>
        }
      />

      {(codes?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Todavía no hay códigos"
          description="Crea códigos para promociones puntuales, campañas o emails con descuento."
          action={
            <Link
              href="/admin/codigos/nuevo"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Plus className="h-4 w-4" /> Nuevo código
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(codes ?? []).map((c) => {
                const Icon = TYPE_ICON[c.discount_type] ?? Percent;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-mono text-sm font-semibold">
                        {c.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.label}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs">
                          {DISCOUNT_TYPE_LABEL[c.discount_type] ??
                            c.discount_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.discount_type === "free_shipping"
                        ? "—"
                        : c.discount_type === "percent"
                          ? `${Number(c.value)}%`
                          : formatMXN(Number(c.value))}
                    </TableCell>
                    <TableCell>
                      {c.min_subtotal === null
                        ? "—"
                        : formatMXN(Number(c.min_subtotal))}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.times_used}
                      {c.usage_limit !== null ? ` / ${c.usage_limit}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatWindow(c.starts_at, c.ends_at)}
                    </TableCell>
                    <TableCell>
                      {c.active ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="muted">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <form
                          action={toggleCodeActiveAction.bind(
                            null,
                            c.id,
                            !c.active,
                          )}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            {c.active ? "Pausar" : "Activar"}
                          </Button>
                        </form>
                        <Link
                          href={`/admin/codigos/${c.id}`}
                          className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium hover:bg-muted"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deleteCodeAction.bind(null, c.id)}
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
