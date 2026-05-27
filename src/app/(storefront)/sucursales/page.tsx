import { MapPin, Phone, Clock, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/empty-state";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sucursales",
  description: "Visita nuestras sucursales para recoger tu pedido.",
};
export const revalidate = 300;

export default async function BranchesPage() {
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("active", true)
    .order("name");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Sucursales
        </h1>
        <p className="text-muted-foreground">
          Visita o recoge tu pedido en cualquiera de nuestras sucursales.
        </p>
      </header>

      {(branches?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Store}
          title="Pronto abriremos sucursales"
          description="Por ahora solo entregamos por paquetería nacional."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(branches ?? []).map((b) => (
            <Card key={b.id}>
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{b.name}</h2>
                </div>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {b.address}
                    <br />
                    {b.city}
                  </span>
                </p>
                {b.phone ? (
                  <p className="flex items-center gap-2 text-sm">
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
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{b.hours}</span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
