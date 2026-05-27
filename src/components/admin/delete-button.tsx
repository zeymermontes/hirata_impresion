"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  action: () => Promise<void>;
  label?: string;
  confirmMessage?: string;
  className?: string;
  size?: "sm" | "md";
};

export function DeleteButton({
  action,
  label = "Eliminar",
  confirmMessage = "¿Eliminar? Esta acción no se puede deshacer.",
  className,
  size = "sm",
}: Props) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(confirmMessage)) start(() => action());
      }}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50",
        size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm",
        className,
      )}
    >
      <Trash2 className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {pending ? "Eliminando..." : label}
    </button>
  );
}
