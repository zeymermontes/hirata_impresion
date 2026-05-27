import Link from "next/link";
import { Plus, Folder, CornerDownRight, Navigation } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { DeleteButton } from "@/components/admin/delete-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { deleteCategoryAction } from "@/app/admin/categorias/actions";

export const metadata = { title: "Categorías" };

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  image_url: string | null;
  show_in_header: boolean;
};

export default async function CategoriesAdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, image_url, show_in_header")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (data ?? []) as CategoryRow[];
  const tree = buildTree(categories);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categorías"
        description="Organiza los productos en categorías que se muestran en la tienda."
        action={
          <Link
            href="/admin/categorias/nuevo"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Nueva categoría
          </Link>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Aún no hay categorías"
          description="Crea la primera para empezar a clasificar productos."
          action={
            <Link
              href="/admin/categorias/nuevo"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Plus className="h-4 w-4" /> Nueva categoría
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portada</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.map((node) => renderRow(node, 0))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

type CategoryNode = CategoryRow & { children: CategoryNode[] };

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>(
    rows.map((r) => [r.id, { ...r, children: [] }]),
  );
  const roots: CategoryNode[] = [];

  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      // Orphan or top-level
      roots.push(node);
    }
  }

  // Sort each level by sort_order ASC, then name.
  const sortLevel = (list: CategoryNode[]) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    list.forEach((n) => sortLevel(n.children));
  };
  sortLevel(roots);

  return roots;
}

function renderRow(node: CategoryNode, depth: number): React.ReactNode {
  return (
    <>
      <TableRow key={node.id}>
        <TableCell>
          <div className="h-10 w-16 overflow-hidden rounded bg-muted">
            {node.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </TableCell>
        <TableCell className="font-medium">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: depth * 24 }}
          >
            {depth > 0 ? (
              <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : null}
            <span>{node.name}</span>
            {node.children.length > 0 ? (
              <Badge variant="muted" className="ml-1">
                {node.children.length} sub
              </Badge>
            ) : null}
            {node.show_in_header ? (
              <Badge variant="default" className="ml-1">
                <Navigation className="h-3 w-3" /> En header
              </Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {node.slug}
        </TableCell>
        <TableCell>{node.sort_order}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Link
              href={`/admin/categorias/${node.id}`}
              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium hover:bg-muted"
            >
              Editar
            </Link>
            <DeleteButton action={deleteCategoryAction.bind(null, node.id)} />
          </div>
        </TableCell>
      </TableRow>
      {node.children.map((child) => (
        <RowFragment key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function RowFragment({
  node,
  depth,
}: {
  node: CategoryNode;
  depth: number;
}) {
  return renderRow(node, depth);
}
