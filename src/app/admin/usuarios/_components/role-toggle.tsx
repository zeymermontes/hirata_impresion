"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ShieldCheck, User as UserIcon } from "lucide-react";
import {
  updateUserRoleAction,
  type UserActionState,
} from "@/app/admin/usuarios/actions";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  currentRole: "customer" | "admin";
  /** Whether this row is the currently logged-in admin (disables the toggle). */
  isSelf: boolean;
};

export function RoleToggle({ userId, currentRole, isSelf }: Props) {
  const action = updateUserRoleAction.bind(null, userId);
  const [state, formAction] = useActionState<
    UserActionState | undefined,
    FormData
  >(action, undefined);
  const nextRole = currentRole === "admin" ? "customer" : "admin";

  if (isSelf) {
    return (
      <span className="text-xs italic text-muted-foreground">Tu cuenta</span>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="role" value={nextRole} />
      <SubmitButton next={nextRole} />
      {state?.message && !state.ok ? (
        <span className="text-xs text-destructive">{state.message}</span>
      ) : null}
    </form>
  );
}

function SubmitButton({ next }: { next: "customer" | "admin" }) {
  const { pending } = useFormStatus();
  const promoting = next === "admin";
  return (
    <button
      type="submit"
      disabled={pending}
      title={promoting ? "Hacer admin" : "Quitar admin"}
      onClick={(e) => {
        if (
          !confirm(
            promoting
              ? "¿Hacer a este usuario admin? Tendrá acceso completo al panel."
              : "¿Quitarle privilegios de admin? No podrá acceder al panel.",
          )
        )
          e.preventDefault();
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium transition disabled:opacity-50",
        promoting
          ? "hover:border-primary hover:bg-primary/10"
          : "hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {promoting ? (
        <ShieldCheck className="h-3.5 w-3.5" />
      ) : (
        <UserIcon className="h-3.5 w-3.5" />
      )}
      {pending
        ? "..."
        : promoting
          ? "Hacer admin"
          : "Quitar admin"}
    </button>
  );
}
