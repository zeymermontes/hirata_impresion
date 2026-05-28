"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updatePrivacyPolicyAction,
  type PrivacyPolicyState,
} from "@/app/admin/configuracion/actions";
import type { PrivacyPolicy } from "@/lib/settings";

export function PrivacyForm({ policy }: { policy: PrivacyPolicy }) {
  const [state, formAction] = useActionState<
    PrivacyPolicyState | undefined,
    FormData
  >(updatePrivacyPolicyAction, undefined);

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="content">Contenido</Label>
        <Textarea
          id="content"
          name="content"
          rows={18}
          required
          defaultValue={policy.content}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Acepta HTML simple (<code>&lt;h2&gt;</code>, <code>&lt;p&gt;</code>,{" "}
          <code>&lt;ul&gt;</code>, <code>&lt;a&gt;</code>). Se inyecta tal cual
          en <code>/aviso-privacidad</code>. Solo el admin puede editar este
          campo.
        </p>
        {state?.errors?.content?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.content[0]}</p>
        ) : null}
      </div>

      {state?.message && state.ok ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          {state.message}
        </p>
      ) : state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
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
      {pending ? "Guardando..." : "Guardar"}
    </Button>
  );
}
