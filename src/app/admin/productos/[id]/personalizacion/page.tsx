import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ZoneEditor } from "@/app/admin/productos/[id]/personalizacion/_components/zone-editor";
import { requireAdmin } from "@/lib/auth";
import {
  isTemplateConfig,
  parseCustomField,
  type CustomField,
} from "@/lib/customization";
import { cn } from "@/lib/utils";

export const metadata = { title: "Personalización" };

export default async function ProductCustomizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: product }, { data: rawFields }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, is_customizable, template_config")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("customization_fields")
      .select("id, type, name, label, required, options, price_delta_rules")
      .eq("product_id", id)
      .order("sort_order"),
  ]);

  if (!product) notFound();

  const fields: CustomField[] = (rawFields ?? []).map(parseCustomField);
  const initial = isTemplateConfig(product.template_config)
    ? product.template_config
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title={`Personalización: ${product.name}`}
        backHref={`/admin/productos/${product.id}`}
        description="Sube la plantilla base y define dónde se renderiza cada campo del cliente."
      />

      {!product.is_customizable ? (
        <Card>
          <CardContent className="p-6 text-sm">
            <p className="text-muted-foreground">
              Este producto no está marcado como personalizable. Habilita la
              opción <strong>“Permite personalización en línea”</strong> en la
              edición del producto antes de configurar la plantilla.
            </p>
            <Link
              href={`/admin/productos/${product.id}`}
              className={cn("mt-4 inline-flex", buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Volver al producto
            </Link>
          </CardContent>
        </Card>
      ) : fields.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <p className="text-muted-foreground">
              Primero debes definir los <strong>campos de personalización</strong>{" "}
              que el cliente llenará (nombre, opciones, etc.). Sin campos no
              puedes posicionar zonas sobre la plantilla.
            </p>
            <Link
              href={`/admin/productos/${product.id}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Ir a configurar campos
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plantilla y zonas</CardTitle>
            <CardDescription>
              Dibuja un rectángulo por cada campo. El cliente verá su valor
              renderizado dentro de ese rectángulo en tiempo real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ZoneEditor
              productId={product.id}
              fields={fields}
              initial={initial}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
