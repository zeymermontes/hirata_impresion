import Link from "next/link";
import { Plus, Image as ImageIcon } from "lucide-react";
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
import { deleteBannerAction } from "@/app/admin/banners/actions";

export const metadata = { title: "Banners" };

export default async function BannersAdminPage() {
  const { supabase } = await requireAdmin();
  const { data: banners } = await supabase
    .from("banners")
    .select("*")
    .order("position")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Banners"
        description="Banners promocionales que aparecen en la landing."
        action={
          <Link
            href="/admin/banners/nuevo"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Nuevo banner
          </Link>
        }
      />

      {(banners?.length ?? 0) === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Aún no hay banners"
          description="Crea el primer banner promocional para la home."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(banners ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="h-12 w-24 overflow-hidden rounded bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{b.title}</p>
                    {b.subtitle ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {b.subtitle}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{b.position}</Badge>
                  </TableCell>
                  <TableCell>{b.sort_order}</TableCell>
                  <TableCell>
                    {b.active ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="muted">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/banners/${b.id}`}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium hover:bg-muted"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteBannerAction.bind(null, b.id)}
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
