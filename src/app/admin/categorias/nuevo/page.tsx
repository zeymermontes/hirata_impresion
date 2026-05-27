import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryForm } from "@/app/admin/categorias/_components/category-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nueva categoría" };

export default async function NewCategoryPage() {
  const { supabase } = await requireAdmin();
  const { data: parents } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title="Nueva categoría"
        backHref="/admin/categorias"
        description="Crea una categoría visible en el menú y en la landing."
      />
      <Card>
        <CardContent className="p-6">
          <CategoryForm parents={parents ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
