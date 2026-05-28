import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Store, Truck, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatMXN } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { HomeSectionType } from "@/lib/supabase/database.types";

export const revalidate = 60;

// ============================================================
// Types
// ============================================================

type SectionRow = {
  id: string;
  type: HomeSectionType;
  title: string | null;
  config: Record<string, unknown>;
};

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
};

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  base_price: number;
  images: unknown;
};

type PreloadedData = {
  heroBanners: Banner[];
  stripBanners: Banner[];
  categories: Category[];
  products: FeaturedProduct[];
};

// ============================================================
// Page
// ============================================================

export default async function HomePage() {
  const supabase = await createClient();

  // 1. Pull the section list. Anything not active is filtered out so an admin
  // can pause a section without deleting it.
  // Pull active rows for rendering, plus a separate count of *any* cta_band
  // rows (active or inactive) so we can decide whether to keep showing the
  // legacy hardcoded CTA at the bottom. The hardcoded CTA only renders when
  // the admin has not yet expressed any preference about it.
  const [{ data: rawSections }, { count: ctaBandCount }] = await Promise.all([
    supabase
      .from("home_sections")
      .select("id, type, title, config, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("home_sections")
      .select("id", { count: "exact", head: true })
      .eq("type", "cta_band"),
  ]);

  const sections: SectionRow[] = (rawSections ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    config:
      r.config && typeof r.config === "object" && !Array.isArray(r.config)
        ? (r.config as Record<string, unknown>)
        : {},
  }));
  const hasCtaBandConfigured = (ctaBandCount ?? 0) > 0;

  // 2. Pre-load just the data needed by the enabled section types. Compute
  // the maximum N up-front so two `featured_products` sections (e.g. 8 + 12)
  // share a single query for 12 then each render the slice they need.
  const needsHero = sections.some((s) => s.type === "hero_banners");
  const needsStrip = sections.some((s) => s.type === "banner_strip");
  const maxCategories = Math.max(
    0,
    ...sections
      .filter((s) => s.type === "category_grid")
      .map((s) => readPositiveInt(s.config.limit, 6)),
  );
  const maxProducts = Math.max(
    0,
    ...sections
      .filter((s) => s.type === "featured_products")
      .map((s) => readPositiveInt(s.config.limit, 8)),
  );

  // If the table is empty, fall back to a sensible default so a fresh install
  // isn't a blank page. Mirrors the previous hardcoded layout.
  const noConfig = sections.length === 0;
  const fallbackNeedsHero = noConfig || needsHero;
  const fallbackCategoriesCount = noConfig ? 6 : maxCategories;
  const fallbackProductsCount = noConfig ? 8 : maxProducts;

  const [
    { data: heroBannersRaw },
    { data: stripBannersRaw },
    { data: categoriesRaw },
    { data: productsRaw },
  ] = await Promise.all([
    fallbackNeedsHero
      ? supabase
          .from("banners")
          .select("id, title, subtitle, image_url, link_url")
          .eq("position", "hero")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] as Banner[] }),
    noConfig || needsStrip
      ? supabase
          .from("banners")
          .select("id, title, subtitle, image_url, link_url")
          .eq("position", "strip")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [] as Banner[] }),
    fallbackCategoriesCount > 0
      ? supabase
          .from("categories")
          .select("id, slug, name, description, image_url")
          .is("parent_id", null)
          .order("sort_order", { ascending: true })
          .limit(fallbackCategoriesCount)
      : Promise.resolve({ data: [] as Category[] }),
    fallbackProductsCount > 0
      ? supabase
          .from("products")
          .select("id, slug, name, base_price, images")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(fallbackProductsCount)
      : Promise.resolve({ data: [] as FeaturedProduct[] }),
  ]);

  const data: PreloadedData = {
    heroBanners: (heroBannersRaw ?? []) as Banner[],
    stripBanners: (stripBannersRaw ?? []) as Banner[],
    categories: (categoriesRaw ?? []) as Category[],
    products: (productsRaw ?? []) as FeaturedProduct[],
  };

  // 3. Fallback layout if the admin hasn't configured any sections yet.
  if (sections.length === 0) {
    return (
      <div className="flex flex-col">
        <Hero config={{}} banner={data.heroBanners[0]} />
        <ValueProps />
        <CategoryGrid categories={data.categories} />
        <FeaturedProducts products={data.products} />
        <CtaBand config={{}} />
      </div>
    );
  }

  // 4. Render the configured sections in order, gluing ValueProps right after
  // the first hero (or at the top if no hero is enabled).
  const heroIndex = sections.findIndex((s) => s.type === "hero_banners");
  const valuePropsAfterIndex = heroIndex >= 0 ? heroIndex : -1;

  return (
    <div className="flex flex-col">
      {valuePropsAfterIndex === -1 ? <ValueProps /> : null}
      {sections.map((section, i) => (
        <Fragment key={section.id}>
          {renderSection(section, data)}
          {i === valuePropsAfterIndex ? <ValueProps /> : null}
        </Fragment>
      ))}
      {/* Legacy hardcoded CTA — only when the admin has not added any
          cta_band rows yet (active or inactive). The moment they add one,
          they own the lifecycle of the CTA. */}
      {!hasCtaBandConfigured ? <CtaBand config={{}} /> : null}
    </div>
  );
}

// ============================================================
// Dispatcher
// ============================================================

function renderSection(section: SectionRow, data: PreloadedData) {
  switch (section.type) {
    case "hero_banners":
      return <Hero config={section.config} banner={data.heroBanners[0]} />;
    case "banner_strip":
      return <BannerStrip banners={data.stripBanners} title={section.title} />;
    case "category_grid": {
      const limit = readPositiveInt(section.config.limit, 6);
      return (
        <CategoryGrid
          categories={data.categories.slice(0, limit)}
          title={section.title}
        />
      );
    }
    case "featured_products": {
      const limit = readPositiveInt(section.config.limit, 8);
      return (
        <FeaturedProducts
          products={data.products.slice(0, limit)}
          title={section.title}
        />
      );
    }
    case "custom_html":
      return (
        <CustomHtml
          html={typeof section.config.html === "string" ? section.config.html : ""}
        />
      );
    case "cta_band":
      return <CtaBand config={section.config} />;
    default:
      return null;
  }
}

function readPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// ============================================================
// Section renderers
// ============================================================

/**
 * Hero content resolution order:
 *   1. `home_sections.config` for the hero_banners section (admin-controlled)
 *   2. The first active banner with position='hero' (legacy fallback)
 *   3. Hard-coded brand defaults (so a fresh install still looks good)
 *
 * A button hides entirely when its label resolves to empty — the admin can
 * leave it blank in the section form to remove either CTA.
 */
function Hero({
  config,
  banner,
}: {
  config: Record<string, unknown>;
  banner?: Banner;
}) {
  const str = (k: string): string | undefined => {
    const v = config[k];
    return typeof v === "string" && v.trim() ? v : undefined;
  };

  const title =
    str("title") ?? banner?.title ?? "Imprime lo que imaginas, sin mínimos.";
  const subtitle =
    str("subtitle") ??
    banner?.subtitle ??
    "Lonas, vinilos, papelería y rotulación. Sube tu archivo o personaliza en línea con preview en vivo.";
  const imageUrl = str("image_url") ?? banner?.image_url;

  // Admin can blank out a label to hide that CTA. For new installs we still
  // show the originals so the hero never ships with zero buttons.
  const usingConfig = Object.keys(config).length > 1; // more than just `position`
  const primaryLabel = usingConfig
    ? str("primary_label")
    : (str("primary_label") ?? "Ver productos");
  const primaryHref =
    str("primary_href") ?? banner?.link_url ?? "/productos";
  const secondaryLabel = usingConfig
    ? str("secondary_label")
    : (str("secondary_label") ?? "Pedir cotización");
  const secondaryHref = str("secondary_href") ?? "/contacto";

  return (
    <section className="relative isolate overflow-hidden bg-secondary text-secondary-foreground">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Imprenta digital
          </span>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-xl text-lg text-secondary-foreground/80">
            {subtitle}
          </p>
          {primaryLabel || secondaryLabel ? (
            <div className="flex flex-wrap gap-3">
              {primaryLabel ? (
                <Link
                  href={primaryHref}
                  className={cn(buttonVariants({ size: "lg" }), "gap-2")}
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
              {secondaryLabel ? (
                <Link
                  href={secondaryHref}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-secondary-foreground/20 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground",
                  )}
                >
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-primary/20 ring-1 ring-secondary-foreground/10">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-primary text-primary-foreground">
              <span className="text-6xl font-black">HIRATA</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ValueProps() {
  const items = [
    {
      icon: Upload,
      title: "Sube tu diseño",
      body: "PDF, AI, JPG o PNG. Validamos calidad antes de imprimir.",
    },
    {
      icon: Sparkles,
      title: "Personaliza en línea",
      body: "Editor con preview en vivo para tarjetas, volantes y más.",
    },
    {
      icon: Truck,
      title: "Envío nacional",
      body: "A todo México por paquetería con guía rastreable.",
    },
    {
      icon: Store,
      title: "O recoge en sucursal",
      body: "Tu pedido listo para recoger sin costo de envío.",
    },
  ];
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryGrid({
  categories,
  title,
}: {
  categories: Category[];
  title?: string | null;
}) {
  if (categories.length === 0) return null;
  return (
    <section className="bg-muted/40 py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title ?? "Categorías"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              Explora todas las opciones de impresión.
            </p>
          </div>
          <Link
            href="/productos"
            className="text-sm font-medium hover:text-primary"
          >
            Ver todo →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/productos?categoria=${c.slug}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary"
            >
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.image_url}
                  alt={c.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-secondary to-secondary/70" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-white">{c.name}</h3>
                {c.description ? (
                  <p className="mt-1 text-sm text-white/80 line-clamp-2">
                    {c.description}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts({
  products,
  title,
}: {
  products: FeaturedProduct[];
  title?: string | null;
}) {
  if (products.length === 0) {
    return (
      <section className="bg-background py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title ?? "Productos destacados"}
          </h2>
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Aún no hay productos publicados. Crea uno desde el panel admin.
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="bg-background py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title ?? "Productos destacados"}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => {
            const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
            return (
              <Link
                key={p.id}
                href={`/productos/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {imgs[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgs[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
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
      </div>
    </section>
  );
}

function BannerStrip({
  banners,
  title,
}: {
  banners: Banner[];
  title?: string | null;
}) {
  if (banners.length === 0) return null;
  return (
    <section className="border-y border-border bg-background py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {title ? (
          <h2 className="mb-5 text-xl font-bold tracking-tight">{title}</h2>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => {
            const Wrapper = b.link_url ? Link : "div";
            return (
              <Wrapper
                key={b.id}
                href={b.link_url ?? "#"}
                className={cn(
                  "group block overflow-hidden rounded-xl border border-border bg-card",
                  b.link_url && "transition hover:shadow-md",
                )}
              >
                <div className="aspect-[2/1] overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image_url}
                    alt={b.title}
                    className={cn(
                      "h-full w-full object-cover",
                      b.link_url && "transition-transform duration-300 group-hover:scale-105",
                    )}
                  />
                </div>
                <div className="p-3">
                  <p className="font-semibold leading-tight">{b.title}</p>
                  {b.subtitle ? (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {b.subtitle}
                    </p>
                  ) : null}
                </div>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CustomHtml({ html }: { html: string }) {
  if (!html.trim()) return null;
  return (
    <section className="bg-background py-8">
      <div
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        // Admin-authored HTML — trusted (only admins can write to home_sections).
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

/**
 * Resolution order for each field:
 *   1. `home_sections.config` for the cta_band section
 *   2. Hard-coded brand defaults
 *
 * Pass an empty `config` object for the legacy hardcoded render at the
 * bottom of the landing.
 */
function CtaBand({ config }: { config: Record<string, unknown> }) {
  const str = (k: string): string | undefined => {
    const v = config[k];
    return typeof v === "string" && v.trim() ? v : undefined;
  };

  const title = str("title") ?? "¿Tienes un proyecto especial?";
  const subtitle =
    str("subtitle") ??
    "Tirajes grandes, formatos no estándar o acabados especiales: cotizamos a la medida.";
  // For new cta_band sections, the admin can blank the label to hide the
  // button. For the legacy hardcoded render (`config = {}`), keep the
  // original label so the band never ships button-less.
  const usingConfig = Object.keys(config).length > 0;
  const buttonLabel = usingConfig
    ? str("button_label")
    : (str("button_label") ?? "Solicitar cotización");
  const buttonHref = str("button_href") ?? "/contacto";

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-primary-foreground/80">{subtitle}</p>
        </div>
        {buttonLabel ? (
          <Link
            href={buttonHref}
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "shrink-0",
            )}
          >
            {buttonLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
