import Link from "next/link";
import { ShoppingCart, User, ShieldCheck, History } from "lucide-react";
import { HirataLogo } from "@/components/hirata-logo";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCartItemCount, getPendingOrderCount } from "@/lib/cart";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  // Categories the admin chose to show in the header. We cap the list so a
  // misconfiguration doesn't blow up the nav.
  const { data: headerCategories } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("show_in_header", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(6);

  const [cartCount, pendingOrderCount] = await Promise.all([
    getCartItemCount(),
    getPendingOrderCount(),
  ]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <HirataLogo />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/productos"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Productos
          </Link>
          {(headerCategories ?? []).map((c) => (
            <Link
              key={c.slug}
              href={`/productos?categoria=${c.slug}`}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/contacto"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Contacto
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          ) : null}

          {user && pendingOrderCount > 0 ? (
            <Link
              href="/mi-cuenta/pedidos"
              aria-label={`Tienes ${pendingOrderCount} pedido${pendingOrderCount === 1 ? "" : "s"} pendiente${pendingOrderCount === 1 ? "" : "s"}`}
              title="Pedidos pendientes de pago"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
            >
              <History className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {pendingOrderCount}
              </span>
            </Link>
          ) : null}

          <Link
            href="/carrito"
            aria-label="Carrito"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            ) : null}
          </Link>

          {user ? (
            <Link
              href="/mi-cuenta"
              aria-label="Mi cuenta"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
            >
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "ml-1",
              )}
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
