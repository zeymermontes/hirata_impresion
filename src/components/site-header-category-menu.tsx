"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryNavItem = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

/**
 * Header category link with an optional hover-and-focus dropdown listing
 * its child categories. The trigger is a real link (so click still works
 * for the parent), and the dropdown opens on hover OR keyboard focus.
 *
 * If the category has no children, this collapses to a plain link to match
 * the previous header behavior.
 */
export function HeaderCategoryMenu({ item }: { item: CategoryNavItem }) {
  const [open, setOpen] = useState(false);
  // Small delay before closing so moving the cursor between the trigger and
  // the popover doesn't flicker the menu shut.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  const href = `/productos?categoria=${item.slug}`;

  if (item.children.length === 0) {
    return (
      <Link
        href={href}
        className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        {item.name}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        // Only close when focus leaves the entire dropdown subtree.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          scheduleClose();
        }
      }}
    >
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {item.name}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Link>

      {open ? (
        <div
          className="absolute left-1/2 top-full z-50 mt-1 min-w-[200px] -translate-x-1/2 rounded-md border border-border bg-card p-1.5 shadow-lg"
          role="menu"
        >
          <Link
            href={href}
            role="menuitem"
            className="block rounded px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Ver toda la categoría
          </Link>
          <div className="my-1 h-px bg-border" />
          {item.children.map((c) => (
            <Link
              key={c.slug}
              href={`/productos?categoria=${c.slug}`}
              role="menuitem"
              className="block rounded px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
