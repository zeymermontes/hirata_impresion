import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CodeForm } from "@/app/admin/codigos/_components/code-form";

export const metadata = { title: "Nuevo código" };

export default function NewCodePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Nuevo código"
        backHref="/admin/codigos"
        description="Genera un código que el cliente podrá escribir en checkout."
      />
      <Card>
        <CardContent className="p-6">
          <CodeForm />
        </CardContent>
      </Card>
    </div>
  );
}
