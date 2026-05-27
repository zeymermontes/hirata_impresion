import Link from "next/link";
import { Mail, Phone, MessageCircle, Clock, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getContactSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Contacto",
  description:
    "Llámanos, escríbenos o visítanos en nuestras sucursales. Hirata Impresión Digital, México.",
};
// Re-fetched on every request so updates from /admin/configuracion show up
// immediately — the admin action also calls revalidatePath('/contacto').
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const supabase = await createClient();
  const contact = await getContactSettings();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, address, city, phone, hours")
    .eq("active", true)
    .order("name")
    .limit(3);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-2xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Estamos para ayudarte
        </h1>
        <p className="text-muted-foreground">
          ¿Tienes dudas sobre un pedido, necesitas una cotización para tirajes
          grandes, o quieres asesoría sobre acabados? Escríbenos o llámanos —
          respondemos en horario laboral.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ContactCard
          icon={MessageCircle}
          label="WhatsApp"
          value={contact.whatsapp_label}
          href={`https://wa.me/${contact.whatsapp}`}
          external
          accent
        />
        <ContactCard
          icon={Phone}
          label="Teléfono"
          value={contact.phone}
          href={`tel:${contact.phone.replace(/\s+/g, "")}`}
        />
        <ContactCard
          icon={Mail}
          label="Correo"
          value={contact.email}
          href={`mailto:${contact.email}`}
        />
      </div>

      {(branches?.length ?? 0) > 0 ? (
        <section className="mt-12 space-y-4">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Sucursales</h2>
            <Link
              href="/sucursales"
              className="text-sm font-medium hover:text-primary"
            >
              Ver todas →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(branches ?? []).map((b) => (
              <Card key={b.id}>
                <CardContent className="space-y-3 p-5 text-sm">
                  <h3 className="text-base font-semibold">{b.name}</h3>
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {b.address}
                      <br />
                      {b.city}
                    </span>
                  </p>
                  {b.phone ? (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${b.phone.replace(/\s+/g, "")}`}
                        className="hover:text-primary"
                      >
                        {b.phone}
                      </a>
                    </p>
                  ) : null}
                  {b.hours ? (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{b.hours}</span>
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12 rounded-xl bg-primary text-primary-foreground">
        <div className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              ¿Tirajes grandes o algo especial?
            </h2>
            <p className="text-primary-foreground/80">
              Cotizamos a la medida para empresas, eventos y proyectos
              personalizados.
            </p>
          </div>
          <a
            href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
              "Hola, me gustaría cotizar un proyecto.",
            )}`}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "shrink-0 gap-2",
            )}
          >
            Cotizar por WhatsApp
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
  external,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm",
        accent && "bg-gradient-to-br from-card to-primary/5",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md",
          accent ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
          {label === "WhatsApp" ? "Abrir chat" : "Click para contactar"} →
        </p>
      </div>
    </a>
  );
}
