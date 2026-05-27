import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Wand2, ArrowRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ProductForm } from "@/app/admin/productos/_components/product-form";
import { VariantsSection } from "@/app/admin/productos/_components/variants-section";
import { CustomizationFieldsSection } from "@/app/admin/productos/[id]/_components/customization-fields-section";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [
    { data: product },
    { data: categories },
    { data: variants },
    { data: customFields },
    { data: productCategoryLinks },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("sort_order"),
    supabase
      .from("customization_fields")
      .select("*")
      .eq("product_id", id)
      .order("sort_order"),
    supabase
      .from("product_categories")
      .select("category_id")
      .eq("product_id", id),
  ]);

  if (!product) notFound();

  const additionalCategoryIds = (productCategoryLinks ?? []).map(
    (l) => l.category_id,
  );

  const hasTemplate =
    product.template_config != null &&
    typeof product.template_config === "object";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title={product.name}
        backHref="/admin/productos"
        action={
          product.status === "active" ? (
            <Link
              href={`/productos/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              Ver en tienda <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Información del producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            product={product}
            categories={categories ?? []}
            additionalCategoryIds={additionalCategoryIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variantes</CardTitle>
          <CardDescription>
            Opciones que modifican el precio (tamaños, acabados, papeles...).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VariantsSection productId={product.id} variants={variants ?? []} />
        </CardContent>
      </Card>

      {product.is_customizable ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Campos de personalización</CardTitle>
              <CardDescription>
                Datos que pedirás al cliente al agregar este producto al
                carrito (nombre, opciones de acabado, archivo de diseño, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomizationFieldsSection
                productId={product.id}
                fields={customFields ?? []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview en vivo</CardTitle>
              <CardDescription>
                Sube una plantilla base y define las zonas donde se renderizarán
                los campos. El cliente verá su personalización en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/admin/productos/${product.id}/personalizacion`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "gap-2",
                )}
              >
                <Wand2 className="h-4 w-4" />
                {hasTemplate ? "Editar plantilla" : "Configurar plantilla"}
                <ArrowRight className="h-3 w-3" />
              </Link>
              {!hasTemplate ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sin plantilla todavía. Los clientes podrán llenar los campos
                  pero no verán preview visual.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
