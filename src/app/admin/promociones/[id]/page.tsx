import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PromotionForm } from "@/app/admin/promociones/_components/promotion-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Editar promoción" };

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [
    { data: rule },
    { data: products },
    { data: categories },
    { data: ruleProducts },
    { data: ruleCategories },
  ] = await Promise.all([
    supabase.from("promotion_rules").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("products")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("promotion_rule_products")
      .select("product_id")
      .eq("promotion_rule_id", id),
    supabase
      .from("promotion_rule_categories")
      .select("category_id")
      .eq("promotion_rule_id", id),
  ]);

  if (!rule) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title={rule.name} backHref="/admin/promociones" />
      <Card>
        <CardContent className="p-6">
          <PromotionForm
            rule={{
              ...rule,
              discount_value: Number(rule.discount_value),
              min_subtotal:
                rule.min_subtotal === null ? null : Number(rule.min_subtotal),
            }}
            selectedProductIds={(ruleProducts ?? []).map((r) => r.product_id)}
            selectedCategoryIds={(ruleCategories ?? []).map((r) => r.category_id)}
            products={products ?? []}
            categories={categories ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
