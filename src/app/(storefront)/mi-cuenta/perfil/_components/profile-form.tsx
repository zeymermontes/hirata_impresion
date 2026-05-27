"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/app/(storefront)/mi-cuenta/perfil/actions";

type Profile = { full_name: string | null; phone: string | null };

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string;
}) {
  const [state, formAction] = useActionState<
    ProfileActionState | undefined,
    FormData
  >(updateProfileAction, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label>Correo</Label>
        <Input value={email} disabled />
        <p className="text-xs text-muted-foreground">
          El correo no se puede cambiar desde aquí.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={profile?.full_name ?? ""}
          required
        />
        {state?.errors?.full_name?.[0] ? (
          <p className="text-xs text-destructive">
            {state.errors.full_name[0]}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile?.phone ?? ""}
          placeholder="+52 55 1234 5678"
        />
      </div>

      {state?.message ? (
        <p
          className={
            state.ok
              ? "rounded-md bg-emerald-100 p-3 text-sm text-emerald-900"
              : "rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </Button>
  );
}
