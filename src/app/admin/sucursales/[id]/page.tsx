import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BranchForm } from "@/app/admin/sucursales/_components/branch-form";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Editar sucursal" };

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: branch } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!branch) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader title={branch.name} backHref="/admin/sucursales" />
      <Card>
        <CardContent className="p-6">
          <BranchForm branch={branch} />
        </CardContent>
      </Card>
    </div>
  );
}
