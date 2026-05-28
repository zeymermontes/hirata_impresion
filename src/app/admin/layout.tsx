import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Image as ImageIcon,
  ShoppingBag,
  Tag,
  LayoutPanelLeft,
  Building2,
  Users,
  Settings,
  Sparkles,
  Ticket,
  LogOut,
} from "lucide-react";
import { HirataLogo } from "@/components/hirata-logo";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/promociones", label: "Promociones", icon: Sparkles },
  { href: "/admin/codigos", label: "Códigos", icon: Ticket },
  { href: "/admin/secciones", label: "Landing", icon: LayoutPanelLeft },
  { href: "/admin/sucursales", label: "Sucursales", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Belt-and-suspenders: the proxy already protects /admin, but if someone
  // bypasses it (e.g. direct RSC fetch), this guard ensures we don't render.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-secondary text-secondary-foreground md:flex">
        <div className="border-b border-secondary-foreground/10 p-4">
          <Link href="/" className="block text-secondary-foreground">
            <HirataLogo variant="inverse" />
          </Link>
          <p className="mt-2 text-xs uppercase tracking-wider text-primary">
            Panel admin
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary-foreground/10"
            >
              <item.icon className="h-4 w-4 text-primary" />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction} className="border-t border-secondary-foreground/10 p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary-foreground/10"
          >
            <LogOut className="h-4 w-4 text-primary" />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
          <h1 className="text-sm text-muted-foreground">
            Conectado como{" "}
            <span className="font-medium text-foreground">
              {profile?.full_name || user.email}
            </span>
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Ver tienda →
          </Link>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
