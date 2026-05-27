import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryForm } from "@/app/admin/categorias/_components/category-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Editar categoría" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: category }, { data: parents }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("categories")
      .select("id, name")
      .neq("id", id)
      .order("name"),
  ]);

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title={`Editar: ${category.name}`}
        backHref="/admin/categorias"
      />
      <Card>
        <CardContent className="p-6">
          <CategoryForm category={category} parents={parents ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
