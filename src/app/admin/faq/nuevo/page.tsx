import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FaqForm } from "@/app/admin/faq/_components/faq-form";

export const metadata = { title: "Nueva pregunta" };

export default function NewFaqPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Nueva pregunta"
        backHref="/admin/faq"
        description="Agrega una pregunta y respuesta al FAQ público."
      />
      <Card>
        <CardContent className="p-6">
          <FaqForm />
        </CardContent>
      </Card>
    </div>
  );
}
