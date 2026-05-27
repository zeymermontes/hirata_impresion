import { createClient } from "@/lib/supabase/server";
import { formatMXN } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [products, orders, pendingOrders, banners] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total", { count: "exact" }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("banners")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
  ]);

  const totalRevenue = (orders.data ?? []).reduce(
    (acc, o) => acc + Number(o.total ?? 0),
    0,
  );

  const stats = [
    { label: "Productos", value: products.count ?? 0 },
    { label: "Pedidos totales", value: orders.count ?? 0 },
    { label: "Pedidos pendientes", value: pendingOrders.count ?? 0 },
    { label: "Banners activos", value: banners.count ?? 0 },
    { label: "Ingresos acumulados", value: formatMXN(totalRevenue) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Resumen general del estado de la tienda.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Las secciones del panel (productos, banners, pedidos, etc.) se
        construirán en las siguientes fases. Por ahora ya puedes navegar a las
        rutas placeholder desde el menú lateral.
      </div>
    </div>
  );
}
