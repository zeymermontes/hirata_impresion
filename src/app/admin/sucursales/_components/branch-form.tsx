"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createBranchAction,
  updateBranchAction,
  type BranchActionState,
} from "@/app/admin/sucursales/actions";

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  hours: string | null;
  active: boolean;
};

export function BranchForm({ branch }: { branch?: Branch }) {
  const action = branch
    ? updateBranchAction.bind(null, branch.id)
    : createBranchAction;
  const [state, formAction] = useActionState<
    BranchActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre de la sucursal</Label>
        <Input id="name" name="name" required defaultValue={branch?.name ?? ""} />
        {state?.errors?.name?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Dirección</Label>
        <Textarea
          id="address"
          name="address"
          rows={2}
          required
          defaultValue={branch?.address ?? ""}
        />
        {state?.errors?.address?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.address[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            name="city"
            required
            defaultValue={branch?.city ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+52 55 1234 5678"
            defaultValue={branch?.phone ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="hours">Horario</Label>
        <Input
          id="hours"
          name="hours"
          placeholder="Lun-Vie 9:00-19:00 · Sáb 9:00-14:00"
          defaultValue={branch?.hours ?? ""}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="active" defaultChecked={branch ? branch.active : true} />
        Activa (visible para clientes en checkout)
      </label>

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton label={branch ? "Guardar cambios" : "Crear sucursal"} />
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : label}
    </Button>
  );
}
