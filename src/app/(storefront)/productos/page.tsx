import Link from "next/link";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { CategoryBannerCarousel } from "@/app/(storefront)/productos/_components/category-banner-carousel";
import { createClient } from "@/lib/supabase/server";
import { formatMXN, cn } from "@/lib/utils";

export const metadata = { title: "Productos" };
export const revalidate = 60;

type SearchParams = Promise<{ categoria?: string; q?: string }>;

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

type CategoryNode = CategoryRow & { children: CategoryNode[] };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { categoria, q } = await searchParams;
  const supabase = await createClient();

  const { data: rawCategories } = await supabase
    .from("categories")
    .select("id, slug, name, parent_id, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (rawCategories ?? []) as CategoryRow[];
  const tree = buildTree(categories);

  let activeCategory: CategoryRow | null = null;
  let categoryIds: string[] = [];
  if (categoria) {
    const match = categories.find((c) => c.slug === categoria);
    if (match) {
      activeCategory = match;
      categoryIds = collectDescendantIds(match.id, categories);
    }
  }

  // Resolve the set of product ids that match the category filter (including
  // multi-category links via product_categories) BEFORE the main products
  // query, so we can fetch a single page of products with all filters applied.
  let productIdFilter: string[] | null = null;
  if (categoryIds.length > 0) {
    const [{ data: primary }, { data: linked }] = await Promise.all([
      supabase
        .from("products")
        .select("id")
        .in("category_id", categoryIds),
      supabase
        .from("product_categories")
        .select("product_id")
        .in("category_id", categoryIds),
    ]);
    const ids = new Set<string>();
    for (const p of primary ?? []) ids.add(p.id);
    for (const link of linked ?? []) ids.add(link.product_id);
    productIdFilter = Array.from(ids);
  }

  // Banners for the active category — one or many; the carousel handles both.
  type CategoryBannerRow = {
    id: string;
    title: string;
    subtitle: string | null;
    image_url: string;
    link_url: string | null;
  };
  let categoryBanners: CategoryBannerRow[] = [];
  if (activeCategory) {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("banners")
      .select("id, title, subtitle, image_url, link_url, starts_at, ends_at")
      .eq("position", "category")
      .eq("category_id", activeCategory.id)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    // Filter time windows in JS — Postgres doesn't make it easy with NULLs.
    categoryBanners = (data ?? []).filter((b) => {
      const startOk = !b.starts_at || b.starts_at <= nowIso;
      const endOk = !b.ends_at || b.ends_at > nowIso;
      return startOk && endOk;
    });
  }

  let query = supabase
    .from("products")
    .select("id, slug, name, base_price, images, is_customizable, requires_file")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (productIdFilter !== null) {
    if (productIdFilter.length === 0) {
      // Filter set is non-empty but no products matched — short-circuit so
      // we don't fetch everything by skipping the where clause.
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      query = query.in("id", productIdFilter);
    }
  }
  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products } = await query;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {categoryBanners.length > 0 ? (
        <div className="mb-8">
          <CategoryBannerCarousel banners={categoryBanners} />
        </div>
      ) : null}

      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {activeCategory ? activeCategory.name : "Todos los productos"}
        </h1>
        <form className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Buscar productos..."
            defaultValue={q ?? ""}
            className="pl-9"
          />
          {categoria ? (
            <input type="hidden" name="categoria" value={categoria} />
          ) : null}
        </form>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categorías
          </p>
          <Link
            href="/productos"
            className={cn(
              "block rounded-md px-3 py-2 text-sm hover:bg-muted",
              !categoria && "bg-muted font-medium",
            )}
          >
            Todas
          </Link>
          {tree.map((node) => (
            <CategoryLink
              key={node.id}
              node={node}
              depth={0}
              activeSlug={categoria}
            />
          ))}
        </aside>

        <div>
          {(products?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Package}
              title="No encontramos productos"
              description={
                q
                  ? `Sin resultados para "${q}".`
                  : "Aún no hay productos publicados en esta categoría."
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(products ?? []).map((p) => {
                const imgs = Array.isArray(p.images)
                  ? (p.images as string[])
                  : [];
                return (
                  <Link
                    key={p.id}
                    href={`/productos/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      {imgs[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgs[0]}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : null}
                      <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                        {p.is_customizable ? (
                          <Badge variant="default">Personalizable</Badge>
                        ) : null}
                        {p.requires_file ? (
                          <Badge variant="secondary">Sube tu diseño</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-semibold leading-tight">{p.name}</h3>
                      <p className="mt-auto pt-2 text-lg font-bold">
                        {formatMXN(Number(p.base_price))}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryLink({
  node,
  depth,
  activeSlug,
}: {
  node: CategoryNode;
  depth: number;
  activeSlug: string | undefined;
}) {
  return (
    <>
      <Link
        href={`/productos?categoria=${node.slug}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        className={cn(
          "block rounded-md py-2 pr-3 text-sm hover:bg-muted",
          activeSlug === node.slug && "bg-muted font-medium",
        )}
      >
        {depth > 0 ? (
          <span className="mr-1 text-muted-foreground">›</span>
        ) : null}
        {node.name}
      </Link>
      {node.children.map((child) => (
        <CategoryLink
          key={child.id}
          node={child}
          depth={depth + 1}
          activeSlug={activeSlug}
        />
      ))}
    </>
  );
}

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>(
    rows.map((r) => [r.id, { ...r, children: [] }]),
  );
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortLevel = (list: CategoryNode[]) => {
    list.sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    list.forEach((n) => sortLevel(n.children));
  };
  sortLevel(roots);
  return roots;
}

/**
 * Return the id of `rootId` plus the ids of all its descendants (depth-first).
 * Used when filtering products: clicking a parent category should also list
 * products tagged under any of its children.
 */
function collectDescendantIds(rootId: string, rows: CategoryRow[]): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const r of rows) {
    if (r.parent_id) {
      const arr = childrenByParent.get(r.parent_id) ?? [];
      arr.push(r.id);
      childrenByParent.set(r.parent_id, arr);
    }
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    const children = childrenByParent.get(id);
    if (children) stack.push(...children);
  }
  return out;
}
