"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X, ChevronDown, ShieldCheck } from "lucide-react";
import { HirataLogo } from "@/components/hirata-logo";
import { buttonVariants } from "@/components/ui/button";
import type { CategoryNavItem } from "@/components/site-header-category-menu";
import { cn } from "@/lib/utils";

type Props = {
  items: CategoryNavItem[];
  isAdmin: boolean;
  isAuthed: boolean;
};

/**
 * Mobile-only hamburger + slide-in nav drawer. Mirrors the desktop nav
 * (categories with expandable subcategories, plus account links). The
 * drawer is purely client-side state; the trigger and the panel live in
 * the same component so we don't have to plumb open/close through the
 * server-rendered header.
 *
 * UX touches:
 *   - Locks page scroll while open
 *   - Closes on Escape, backdrop click, and link navigation
 *   - Trigger swaps to an X while open for clear affordance
 */
export function SiteHeaderMobileNav({ items, isAdmin, isAuthed }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

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

  function toggleExpanded(slug: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function close() {
    setOpen(false);
  }

  // Portaled out of the header because the sticky <header> has
  // `backdrop-blur` which creates a new containing block for
  // position:fixed descendants — that would clip the drawer to the
  // header's 64px height. Rendering at <body> keeps fixed positioning
  // relative to the viewport.
  const portal = mounted ? (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        id="site-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navegación"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-sm flex-col bg-background shadow-xl transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/" onClick={close} className="flex items-center">
            <HirataLogo />
          </Link>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={close}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <MobileLink href="/productos" onClick={close}>
            Todos los productos
          </MobileLink>

          {items.map((item) => {
            const isOpen = expanded.has(item.slug);
            const hasChildren = item.children.length > 0;
            return (
              <div key={item.slug} className="border-t border-border/60">
                <div className="flex items-stretch">
                  <Link
                    href={`/productos?categoria=${item.slug}`}
                    onClick={close}
                    className="flex-1 px-3 py-3 text-base font-medium"
                  >
                    {item.name}
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.slug)}
                      aria-label={isOpen ? "Cerrar subcategorías" : "Ver subcategorías"}
                      aria-expanded={isOpen}
                      className="inline-flex w-11 items-center justify-center text-muted-foreground hover:bg-muted"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                  ) : null}
                </div>
                {hasChildren && isOpen ? (
                  <ul className="pb-2 pl-6">
                    {item.children.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/productos?categoria=${c.slug}`}
                          onClick={close}
                          className="block py-2 text-sm text-foreground/80"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}

          <div className="mt-2 border-t border-border/60 pt-2">
            <MobileLink href="/contacto" onClick={close}>
              Contacto
            </MobileLink>
            <MobileLink href="/sucursales" onClick={close}>
              Sucursales
            </MobileLink>
          </div>

          <div className="mt-2 border-t border-border/60 pt-2">
            {isAuthed ? (
              <>
                <MobileLink href="/mi-cuenta" onClick={close}>
                  Mi cuenta
                </MobileLink>
                <MobileLink href="/mi-cuenta/pedidos" onClick={close}>
                  Mis pedidos
                </MobileLink>
              </>
            ) : (
              <>
                <MobileLink href="/login" onClick={close}>
                  Iniciar sesión
                </MobileLink>
                <MobileLink href="/registro" onClick={close}>
                  Crear cuenta
                </MobileLink>
              </>
            )}
          </div>
        </nav>

        {isAdmin ? (
          <div className="shrink-0 border-t border-border p-3">
            <Link
              href="/admin"
              onClick={close}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "w-full justify-center gap-2",
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Panel admin
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="site-mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted md:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {portal ? createPortal(portal, document.body) : null}
    </>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
    >
      {children}
    </Link>
  );
}
