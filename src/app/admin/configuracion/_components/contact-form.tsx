"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updateContactSettingsAction,
  type ContactSettingsState,
} from "@/app/admin/configuracion/actions";
import type { ContactSettings } from "@/lib/settings";

export function ContactForm({ contact }: { contact: ContactSettings }) {
  const [state, formAction] = useActionState<
    ContactSettingsState | undefined,
    FormData
  >(updateContactSettingsAction, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <Field
        name="email"
        label="Correo de contacto"
        type="email"
        defaultValue={contact.email}
        error={state?.errors?.email?.[0]}
        placeholder="hola@hirata.mx"
        required
      />

      <Field
        name="phone"
        label="Teléfono (visible al cliente)"
        type="tel"
        defaultValue={contact.phone}
        error={state?.errors?.phone?.[0]}
        placeholder="+52 55 1234 5678"
        required
      />

      <Field
        name="whatsapp"
        label="WhatsApp (solo dígitos, con código de país)"
        defaultValue={contact.whatsapp}
        error={state?.errors?.whatsapp?.[0]}
        placeholder="525512345678"
        required
        hint="Sin '+' ni espacios. Se usa en los links de wa.me/..."
      />

      <Field
        name="whatsapp_label"
        label="WhatsApp formateado (visible al cliente)"
        defaultValue={contact.whatsapp_label}
        error={state?.errors?.whatsapp_label?.[0]}
        placeholder="+52 55 1234 5678"
        required
      />

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

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  error,
  placeholder,
  required,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
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
