"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createAddressAction,
  updateAddressAction,
  type AddressActionState,
} from "@/app/(storefront)/mi-cuenta/direcciones/actions";

type Address = {
  id: string;
  label: string;
  recipient: string;
  street: string;
  ext_number: string | null;
  int_number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  is_default: boolean;
};

export function AddressForm({
  address,
  onDone,
  redirectTo,
}: {
  address?: Address;
  onDone?: () => void;
  /**
   * When set and the address is created successfully, navigates to this URL.
   * Used for the "came from checkout to add an address" flow so the customer
   * doesn't have to manually go back.
   */
  redirectTo?: string;
}) {
  const router = useRouter();
  const action = address
    ? updateAddressAction.bind(null, address.id)
    : createAddressAction;
  const [state, formAction] = useActionState<
    AddressActionState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result?.ok) {
      if (redirectTo && !address) {
        // Only redirect on CREATE, not on edit. The router push triggers a
        // refetch on the destination so the new address shows up in checkout.
        router.push(redirectTo);
        router.refresh();
        return result;
      }
      if (onDone) onDone();
    }
    return result;
  }, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field
          name="label"
          label="Etiqueta (ej. Casa)"
          defaultValue={address?.label}
          error={state?.errors?.label?.[0]}
          required
        />
        <Field
          name="recipient"
          label="Recibe"
          defaultValue={address?.recipient}
          error={state?.errors?.recipient?.[0]}
          required
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <Field
          name="street"
          label="Calle"
          defaultValue={address?.street}
          error={state?.errors?.street?.[0]}
          required
        />
        <Field
          name="ext_number"
          label="N° Exterior"
          defaultValue={address?.ext_number ?? ""}
        />
        <Field
          name="int_number"
          label="N° Interior"
          defaultValue={address?.int_number ?? ""}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field
          name="neighborhood"
          label="Colonia"
          defaultValue={address?.neighborhood ?? ""}
        />
        <Field
          name="zip"
          label="Código postal"
          defaultValue={address?.zip}
          error={state?.errors?.zip?.[0]}
          required
          maxLength={5}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field
          name="city"
          label="Ciudad"
          defaultValue={address?.city}
          error={state?.errors?.city?.[0]}
          required
        />
        <Field
          name="state"
          label="Estado"
          defaultValue={address?.state}
          error={state?.errors?.state?.[0]}
          required
        />
      </div>

      <Field
        name="phone"
        label="Teléfono de contacto (opcional)"
        defaultValue={address?.phone ?? ""}
        type="tel"
      />

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          name="is_default"
          defaultChecked={address?.is_default ?? false}
        />
        Usar como dirección principal
      </label>

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onDone ? (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
        ) : null}
        <SubmitButton edit={Boolean(address)} />
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
  required,
  maxLength,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SubmitButton({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? "Guardando..."
        : edit
          ? "Guardar cambios"
          : "Guardar dirección"}
    </Button>
  );
}
