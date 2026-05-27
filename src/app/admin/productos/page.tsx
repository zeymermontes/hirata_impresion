import Link from "next/link";
import { Plus, Package } from "lucide-react";
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
import { cn, formatMXN } from "@/lib/utils";
import { deleteProductAction } from "@/app/admin/productos/actions";

export const metadata = { title: "Productos" };

const STATUS_VARIANT = {
  active: "success",
  draft: "muted",
  archived: "warning",
} as const;

const STATUS_LABEL = {
  active: "Activo",
  draft: "Borrador",
  archived: "Archivado",
} as const;

type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  status: "draft" | "active" | "archived";
  images: unknown;
  category_id: string | null;
  categories: { name: string } | null;
};

export default async function ProductsAdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, slug, base_price, status, images, category_id, categories!category_id(name)",
    )
    .order("created_at", { ascending: false });
  const products = (data ?? []) as unknown as ProductListRow[];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Productos"
        description="Catálogo de productos disponibles en la tienda."
        action={
          <Link
            href="/admin/productos/nuevo"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Nuevo producto
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aún no hay productos"
          description="Empieza creando tu primer producto."
          action={
            <Link
              href="/admin/productos/nuevo"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Plus className="h-4 w-4" /> Nuevo producto
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio base</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
                const status = p.status;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="h-12 w-12 overflow-hidden rounded bg-muted">
                        {imgs[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgs[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {p.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.categories?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatMXN(Number(p.base_price))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[status]}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/productos/${p.id}`}
                          className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium hover:bg-muted"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deleteProductAction.bind(null, p.id)}
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
