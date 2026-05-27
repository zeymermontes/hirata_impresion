import Link from "next/link";
import { ArrowRight, Truck, Store, Upload, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatMXN } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: heroBanners }, { data: categories }, { data: featured }] =
    await Promise.all([
      supabase
        .from("banners")
        .select("*")
        .eq("position", "hero")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(5),
      supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
        .limit(6),
      supabase
        .from("products")
        .select("id, slug, name, base_price, images")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  return (
    <div className="flex flex-col">
      <Hero banners={heroBanners ?? []} />
      <ValueProps />
      <CategoryGrid categories={categories ?? []} />
      <FeaturedProducts products={featured ?? []} />
      <CtaBand />
    </div>
  );
}

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
};

function Hero({ banners }: { banners: Banner[] }) {
  const banner = banners[0];
  return (
    <section className="relative isolate overflow-hidden bg-secondary text-secondary-foreground">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Imprenta digital
          </span>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {banner?.title ?? "Imprime lo que imaginas, sin mínimos."}
          </h1>
          <p className="max-w-xl text-lg text-secondary-foreground/80">
            {banner?.subtitle ??
              "Lonas, vinilos, papelería y rotulación. Sube tu archivo o personaliza en línea con preview en vivo."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={banner?.link_url ?? "/productos"}
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              Ver productos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contacto"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-secondary-foreground/20 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground",
              )}
            >
              Pedir cotización
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-primary/20 ring-1 ring-secondary-foreground/10">
          {banner?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.image_url}
              alt={banner.title}
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

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="bg-muted/40 py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Categorías
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

type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  base_price: number;
  images: unknown;
};

function FeaturedProducts({ products }: { products: FeaturedProduct[] }) {
  if (products.length === 0) {
    return (
      <section className="bg-background py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Productos destacados
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
          Productos destacados
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

function CtaBand() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            ¿Tienes un proyecto especial?
          </h2>
          <p className="mt-1 max-w-xl text-primary-foreground/80">
            Tirajes grandes, formatos no estándar o acabados especiales:
            cotizamos a la medida.
          </p>
        </div>
        <Link
          href="/contacto"
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "shrink-0",
          )}
        >
          Solicitar cotización
        </Link>
      </div>
    </section>
  );
}
