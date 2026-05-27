import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { deleteBranchAction } from "@/app/admin/sucursales/actions";

export const metadata = { title: "Sucursales" };

export default async function BranchesAdminPage() {
  const { supabase } = await requireAdmin();
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sucursales"
        description="Puntos de venta donde los clientes pueden recoger sus pedidos."
        action={
          <Link
            href="/admin/sucursales/nueva"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Nueva sucursal
          </Link>
        }
      />

      {(branches?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aún no hay sucursales"
          description="Agrega tu primera sucursal para habilitar la opción de recoger en tienda."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(branches ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {b.address}
                    </p>
                  </TableCell>
                  <TableCell>{b.city}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {b.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    {b.active ? (
                      <Badge variant="success">Activa</Badge>
                    ) : (
                      <Badge variant="muted">Inactiva</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/sucursales/${b.id}`}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium hover:bg-muted"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteBranchAction.bind(null, b.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
