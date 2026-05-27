import { AdminPageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ContactForm } from "@/app/admin/configuracion/_components/contact-form";
import { requireAdmin } from "@/lib/auth";
import { getContactSettings } from "@/lib/settings";

export const metadata = { title: "Configuración" };

export default async function ConfigurationPage() {
  await requireAdmin();
  const contact = await getContactSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title="Configuración"
        description="Información general del sitio que se muestra en /contacto, en el footer y en otros lugares públicos."
      />

      <Card>
        <CardHeader>
          <CardTitle>Datos de contacto</CardTitle>
          <CardDescription>
            Estos valores aparecen en la página de contacto. El teléfono y el
            WhatsApp también se usan para los botones &quot;click to call&quot;
            y &quot;chatear por WhatsApp&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm contact={contact} />
        </CardContent>
      </Card>
    </div>
  );
}
