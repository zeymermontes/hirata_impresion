import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CodeForm } from "@/app/admin/codigos/_components/code-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Editar código" };

export default async function EditCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: code } = await supabase
    .from("promotions")
    .select(
      "id, code, label, description, discount_type, value, min_subtotal, starts_at, ends_at, usage_limit, active",
    )
    .eq("id", id)
    .maybeSingle();
  if (!code) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title={code.code} backHref="/admin/codigos" />
      <Card>
        <CardContent className="p-6">
          <CodeForm
            code={{
              ...code,
              value: Number(code.value),
              min_subtotal:
                code.min_subtotal === null ? null : Number(code.min_subtotal),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
