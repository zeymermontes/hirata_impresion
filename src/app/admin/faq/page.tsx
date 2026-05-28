import Link from "next/link";
import { Plus, HelpCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  deleteFaqAction,
  toggleFaqActiveAction,
} from "@/app/admin/faq/actions";

export const metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

export default async function FaqAdminPage() {
  const { supabase } = await requireAdmin();
  const { data: entries } = await supabase
    .from("faq_entries")
    .select("id, question, answer, sort_order, active, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Preguntas frecuentes"
        description="Listado de preguntas y respuestas que aparecen en la página pública de FAQ."
        action={
          <Link
            href="/admin/faq/nuevo"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Nueva pregunta
          </Link>
        }
      />

      {(entries?.length ?? 0) === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Aún no hay preguntas"
          description="Crea la primera para que aparezca en /preguntas-frecuentes."
          action={
            <Link
              href="/admin/faq/nuevo"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Plus className="h-4 w-4" /> Nueva pregunta
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {(entries ?? []).map((e) => (
            <li key={e.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{e.question}</p>
                      {e.active ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="muted">Oculta</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        orden {e.sort_order}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {stripHtml(e.answer)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form
                      action={toggleFaqActiveAction.bind(
                        null,
                        e.id,
                        !e.active,
                      )}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                      >
                        {e.active ? "Pausar" : "Activar"}
                      </Button>
                    </form>
                    <Link
                      href={`/admin/faq/${e.id}`}
                      className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium hover:bg-muted"
                    >
                      Editar
                    </Link>
                    <DeleteButton
                      action={deleteFaqAction.bind(null, e.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
