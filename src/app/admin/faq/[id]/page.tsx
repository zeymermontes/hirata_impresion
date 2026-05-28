import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FaqForm } from "@/app/admin/faq/_components/faq-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Editar pregunta" };

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: entry } = await supabase
    .from("faq_entries")
    .select("id, question, answer, sort_order, active")
    .eq("id", id)
    .maybeSingle();
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title={entry.question} backHref="/admin/faq" />
      <Card>
        <CardContent className="p-6">
          <FaqForm entry={entry} />
        </CardContent>
      </Card>
    </div>
  );
}
