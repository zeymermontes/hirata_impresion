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
import { ScheduleEditor } from "@/app/admin/sucursales/_components/schedule-editor";
import {
  defaultSchedule,
  hasAnySlot,
  parseBranchSchedule,
  type BranchSchedule,
} from "@/lib/branch-hours";

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  hours: string | null;
  hours_schedule: unknown;
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

  // For an existing branch with no structured schedule yet, start the
  // editor empty (no defaults) so the admin sees the legacy `hours` text
  // and decides explicitly. New branches get the Mexican-papelería
  // defaults so they're not facing seven empty rows.
  const initialSchedule: BranchSchedule = branch
    ? (() => {
        const parsed = parseBranchSchedule(branch.hours_schedule);
        return hasAnySlot(parsed) ? parsed : defaultSchedule();
      })()
    : defaultSchedule();

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
        <Label>Horario</Label>
        <p className="text-xs text-muted-foreground">
          Define horarios por día. Si la sucursal cierra a comer, agrega
          un segundo bloque (ej. 9:00–14:00 y 16:00–19:00). Deja vacío
          un día para marcarlo como cerrado.
        </p>
        <ScheduleEditor name="hours_schedule" defaultValue={initialSchedule} />
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
