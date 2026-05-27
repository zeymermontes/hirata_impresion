import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PromotionForm } from "@/app/admin/promociones/_components/promotion-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nueva promoción" };

export default async function NewPromotionPage() {
  const { supabase } = await requireAdmin();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Nueva promoción"
        backHref="/admin/promociones"
        description="Define las condiciones y se aplicará automáticamente cuando un cliente las cumpla."
      />
      <Card>
        <CardContent className="p-6">
          <PromotionForm
            products={products ?? []}
            categories={categories ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
