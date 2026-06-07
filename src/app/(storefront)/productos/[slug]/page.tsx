import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Truck, Store, Upload, Sparkles, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductActions } from "@/app/(storefront)/productos/[slug]/_components/product-actions";
import { ProductGallery } from "@/app/(storefront)/productos/[slug]/_components/product-gallery";
import { CustomizerForm } from "@/app/(storefront)/productos/[slug]/_components/customizer-form";
import { GiftCardForm } from "@/app/(storefront)/productos/[slug]/_components/gift-card-form";
import { createClient } from "@/lib/supabase/server";
import { formatMXN } from "@/lib/utils";
import {
  isTemplateConfig,
  parseCustomField,
  type CustomField,
} from "@/lib/customization";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, description")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return {
    title: data?.name ?? "Producto",
    description: data?.description ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  type ProductRow = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    base_price: number;
    images: unknown;
    is_customizable: boolean;
    requires_file: boolean;
    template_config: unknown;
    category_id: string | null;
    is_gift_card: boolean;
    gift_card_min_amount: number | null;
    gift_card_max_amount: number | null;
    categories: { slug: string; name: string } | null;
  };

  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, base_price, images, is_customizable, requires_file, template_config, category_id, is_gift_card, gift_card_min_amount, gift_card_max_amount, categories!category_id(slug, name)",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  const product = data as unknown as ProductRow | null;
  if (!product) notFound();

  const [{ data: variants }, { data: rawFields }, userResult] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, name, price_delta")
      .eq("product_id", product.id)
      .order("sort_order"),
    product.is_customizable
      ? supabase
          .from("customization_fields")
          .select(
            "id, type, name, label, required, options, price_delta_rules, visible_variant_ids",
          )
          .eq("product_id", product.id)
          .order("sort_order")
      : Promise.resolve({ data: [] as const }),
    supabase.auth.getUser(),
  ]);
  const buyerEmail = userResult.data.user?.email ?? null;

  const customFields: CustomField[] = (rawFields ?? []).map(parseCustomField);
  const template = isTemplateConfig(product.template_config)
    ? product.template_config
    : null;
  const useCustomizer = product.is_customizable && customFields.length > 0;

  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const category = product.categories;

  const normalizedVariants = (variants ?? []).map((v) => ({
    ...v,
    price_delta: Number(v.price_delta),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/productos" className="hover:text-foreground">
          Productos
        </Link>
        {category ? (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/productos?categoria=${category.slug}`}
              className="hover:text-foreground"
            >
              {category.name}
            </Link>
          </>
        ) : null}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      {product.is_gift_card ? (
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_440px]">
          {images.length > 0 ? (
            <ProductGallery images={images} name={product.name} />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-secondary text-secondary-foreground sm:aspect-square lg:max-h-[440px] lg:max-w-[440px]">
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Gift className="h-8 w-8" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Hirata · Gift card
                </p>
                <p className="max-w-[18rem] text-xs text-secondary-foreground/70">
                  El destinatario la recibe por correo con el código y el saldo
                  apenas se confirme tu pago.
                </p>
              </div>
            </div>
          )}

          <div className="min-w-0 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">
                  <Gift className="h-3 w-3" /> Gift card
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {product.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Elige el monto, escribe a quién va dirigida y se la enviamos
                por correo cuando se confirme tu pago. Se puede usar en varios
                pedidos hasta agotar el saldo.
              </p>
            </div>

            {product.description ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {product.description}
              </p>
            ) : null}

            <div className="rounded-xl border border-border bg-card p-5">
              <GiftCardForm
                productId={product.id}
                minAmount={Number(product.gift_card_min_amount ?? 100)}
                maxAmount={Number(product.gift_card_max_amount ?? 10000)}
                buyerEmail={buyerEmail}
              />
            </div>
          </div>
        </div>
      ) : useCustomizer ? (
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_440px]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery images={images} name={product.name} />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">
                  <Sparkles className="h-3 w-3" /> Personalizable
                </Badge>
                {product.requires_file ? (
                  <Badge variant="secondary">
                    <Upload className="h-3 w-3" /> Sube tu diseño
                  </Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {product.name}
              </h1>
              <p className="text-2xl font-bold">
                Desde {formatMXN(Number(product.base_price))}
              </p>
            </div>

            {product.description ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {product.description}
              </p>
            ) : null}

            <div className="rounded-xl border border-border bg-card p-5">
              <CustomizerForm
                productId={product.id}
                basePrice={Number(product.base_price)}
                variants={normalizedVariants}
                fields={customFields}
                template={template}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_440px]">
          <ProductGallery images={images} name={product.name} />

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {product.is_customizable ? (
                  <Badge variant="default">
                    <Sparkles className="h-3 w-3" /> Personalizable
                  </Badge>
                ) : null}
                {product.requires_file ? (
                  <Badge variant="secondary">
                    <Upload className="h-3 w-3" /> Sube tu diseño
                  </Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {product.name}
              </h1>
              <p className="text-2xl font-bold">
                Desde {formatMXN(Number(product.base_price))}
              </p>
            </div>

            {product.description ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {product.description}
              </p>
            ) : null}

            <div className="rounded-xl border border-border bg-card p-5">
              <ProductActions
                productId={product.id}
                basePrice={Number(product.base_price)}
                variants={normalizedVariants}
                requiresFile={product.requires_file}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <Truck className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">Envío nacional</p>
            <p className="text-muted-foreground">Paquetería con guía rastreable.</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Store className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">Recoge en sucursal</p>
            <p className="text-muted-foreground">Sin costo de envío.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
