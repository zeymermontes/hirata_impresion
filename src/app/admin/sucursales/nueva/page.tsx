import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BranchForm } from "@/app/admin/sucursales/_components/branch-form";

export const metadata = { title: "Nueva sucursal" };

export default function NewBranchPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader title="Nueva sucursal" backHref="/admin/sucursales" />
      <Card>
        <CardContent className="p-6">
          <BranchForm />
        </CardContent>
      </Card>
    </div>
  );
}
