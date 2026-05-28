import Link from "next/link";
import { HelpCircle, ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Preguntas frecuentes",
  description:
    "Resolvemos las dudas más comunes sobre impresión, envíos, pagos y archivos en Hirata Impresión Digital.",
};
export const revalidate = 300;

export default async function FaqPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("faq_entries")
    .select("id, question, answer")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Preguntas frecuentes
        </h1>
        <p className="text-muted-foreground">
          Estas son las dudas que recibimos más seguido. Si la tuya no está
          aquí,{" "}
          <Link href="/contacto" className="font-medium underline">
            escríbenos
          </Link>
          .
        </p>
      </header>

      {(entries?.length ?? 0) === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={HelpCircle}
            title="Aún no hay preguntas publicadas"
            description="Si tienes alguna duda, contáctanos y la responderemos a la brevedad."
            action={
              <Link
                href="/contacto"
                className={buttonVariants({ variant: "default" })}
              >
                Ir a contacto
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
          {(entries ?? []).map((e) => (
            <li key={e.id}>
              <details className="group">
                <summary
                  className={cn(
                    "flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-medium hover:bg-muted/40",
                    "[&::-webkit-details-marker]:hidden",
                  )}
                >
                  <span>{e.question}</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div
                  className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-foreground/80 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5"
                  // Admin-authored HTML (admin-only RLS write).
                  dangerouslySetInnerHTML={{ __html: e.answer }}
                />
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
