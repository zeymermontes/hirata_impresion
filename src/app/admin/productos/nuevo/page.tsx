import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProductForm } from "@/app/admin/productos/_components/product-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Nuevo producto"
        backHref="/admin/productos"
        description="Después de crearlo podrás añadirle variantes (tamaños, acabados...)."
      />
      <Card>
        <CardContent className="p-6">
          <ProductForm categories={categories ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
