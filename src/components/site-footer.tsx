import Link from "next/link";
import { HirataLogo } from "@/components/hirata-logo";
import { createClient } from "@/lib/supabase/server";

type FooterProduct = { slug: string; name: string };

/**
 * Top 4 best-selling products by total quantity in order_items, restricted
 * to active products. Falls back to the most recent active products if
 * there aren't enough orders yet.
 */
async function getFooterProducts(): Promise<FooterProduct[]> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .not("product_id", "is", null);

  const byId = new Map<string, number>();
  for (const it of items ?? []) {
    if (!it.product_id) continue;
    byId.set(it.product_id, (byId.get(it.product_id) ?? 0) + Number(it.quantity));
  }
  const topIds = Array.from(byId.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  const sellers: FooterProduct[] = [];
  if (topIds.length > 0) {
    const { data: rows } = await supabase
      .from("products")
      .select("id, slug, name, status")
      .in("id", topIds)
      .eq("status", "active");
    const byProductId = new Map(rows?.map((r) => [r.id, r]) ?? []);
    for (const id of topIds) {
      const row = byProductId.get(id);
      if (!row) continue;
      sellers.push({ slug: row.slug, name: row.name });
      if (sellers.length >= 4) break;
    }
  }

  if (sellers.length < 4) {
    const { data: fill } = await supabase
      .from("products")
      .select("slug, name")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(4);
    const seen = new Set(sellers.map((s) => s.slug));
    for (const r of fill ?? []) {
      if (seen.has(r.slug)) continue;
      sellers.push({ slug: r.slug, name: r.name });
      if (sellers.length >= 4) break;
    }
  }

  return sellers.slice(0, 4);
}

export async function SiteFooter() {
  const topProducts = await getFooterProducts();
  return (
    <footer className="mt-auto border-t border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:px-8 md:grid-cols-4">
        <div className="space-y-3">
          <HirataLogo variant="inverse" />
          <p className="text-sm text-secondary-foreground/70 max-w-xs">
            Impresión digital profesional. Sube tu diseño y recibe en tu
            domicilio o recoge en sucursal.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">Productos</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {topProducts.map((p) => (
              <li key={p.slug}>
                <Link className="hover:text-primary" href={`/productos/${p.slug}`}>
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">Tu cuenta</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/login">Iniciar sesión</Link></li>
            <li><Link className="hover:text-primary" href="/registro">Crear cuenta</Link></li>
            <li><Link className="hover:text-primary" href="/mi-cuenta/pedidos">Mis pedidos</Link></li>
            <li><Link className="hover:text-primary" href="/mi-cuenta/direcciones">Direcciones</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">Hirata</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/contacto">Contacto</Link></li>
            <li><Link className="hover:text-primary" href="/sucursales">Sucursales</Link></li>
            <li><Link className="hover:text-primary" href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
            <li><Link className="hover:text-primary" href="/aviso-privacidad">Aviso de privacidad</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 text-xs text-secondary-foreground/60">
          <span>© {new Date().getFullYear()} Hirata Impresión Digital.</span>
          <span>Hecho en México</span>
        </div>
      </div>
    </footer>
  );
}
