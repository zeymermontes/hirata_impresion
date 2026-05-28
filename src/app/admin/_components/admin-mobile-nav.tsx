"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
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
} from "lucide-react";
import { HirataLogo } from "@/components/hirata-logo";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

// Nav items live here (not in the server layout) because lucide icon
// components are functions, and React Server Components cannot serialize
// function props across the server→client boundary. The desktop sidebar
// in admin/layout.tsx keeps its own copy — both lists must stay in sync.
const ITEMS = [
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
] as const;

/**
 * Mobile-only hamburger + slide-in drawer for the admin shell. Mirrors the
 * desktop sidebar (same nav items + sign-out). Closes when a link is
 * tapped so picking a destination dismisses the drawer.
 */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Standard hydration-safe portal: SSR renders nothing in the portal
  // slot; client mounts it on first paint after `document.body` exists.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Portaled to <body> so the drawer's `position: fixed` is sized
  // relative to the viewport — any ancestor with backdrop-filter,
  // transform, etc. would otherwise create a new containing block and
  // clip the drawer.
  const portal = mounted ? (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="admin-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navegación del panel"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-xs flex-col bg-secondary text-secondary-foreground shadow-xl transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-secondary-foreground/10 p-4">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={() => setOpen(false)}>
              <HirataLogo variant="inverse" />
            </Link>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary-foreground/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-xs uppercase tracking-wider text-primary">
            Panel admin
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                  active
                    ? "bg-secondary-foreground/15 font-medium"
                    : "hover:bg-secondary-foreground/10",
                )}
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form
          action={signOutAction}
          className="border-t border-secondary-foreground/10 p-3"
        >
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary-foreground/10"
          >
            <LogOut className="h-4 w-4 text-primary" />
            Cerrar sesión
          </button>
        </form>
      </aside>
    </>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted md:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {portal ? createPortal(portal, document.body) : null}
    </>
  );
}
