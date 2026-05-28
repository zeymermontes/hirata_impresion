"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createCodeAction,
  updateCodeAction,
  type CodeActionState,
} from "@/app/admin/codigos/actions";

type PromoCode = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  discount_type: "percent" | "amount" | "free_shipping";
  value: number;
  min_subtotal: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  active: boolean;
};

export function CodeForm({ code }: { code?: PromoCode }) {
  const action = code
    ? updateCodeAction.bind(null, code.id)
    : createCodeAction;
  const [state, formAction] = useActionState<
    CodeActionState | undefined,
    FormData
  >(action, undefined);

  const [type, setType] = useState<PromoCode["discount_type"]>(
    code?.discount_type ?? "percent",
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="code">Código (lo que escribe el cliente)</Label>
          <Input
            id="code"
            name="code"
            required
            defaultValue={code?.code ?? ""}
            placeholder="Ej. BIENVENIDA10"
            className="font-mono uppercase tracking-wide"
            autoCapitalize="characters"
          />
          {state?.errors?.code?.[0] ? (
            <p className="text-xs text-destructive">{state.errors.code[0]}</p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="label">Etiqueta visible al cliente</Label>
          <Input
            id="label"
            name="label"
            required
            defaultValue={code?.label ?? ""}
            placeholder="Ej. 10% de descuento de bienvenida"
          />
          {state?.errors?.label?.[0] ? (
            <p className="text-xs text-destructive">{state.errors.label[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Descripción interna (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={code?.description ?? ""}
          placeholder="Notas para el equipo (campaña, partner, etc.)"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="discount_type">Tipo</Label>
          <Select
            id="discount_type"
            name="discount_type"
            value={type}
            onChange={(e) =>
              setType(e.target.value as PromoCode["discount_type"])
            }
          >
            <option value="percent">% de descuento</option>
            <option value="amount">Descuento fijo ($)</option>
            <option value="free_shipping">Envío gratis</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="value">
            {type === "free_shipping"
              ? "Valor (no aplica)"
              : type === "percent"
                ? "Porcentaje (0-100)"
                : "Monto ($)"}
          </Label>
          <Input
            id="value"
            name="value"
            type="number"
            step={type === "percent" ? "1" : "0.01"}
            min="0"
            max={type === "percent" ? "100" : undefined}
            defaultValue={code?.value ?? 0}
            disabled={type === "free_shipping"}
          />
          {state?.errors?.value?.[0] ? (
            <p className="text-xs text-destructive">
              {state.errors.value[0]}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="min_subtotal">Mínimo de compra ($)</Label>
          <Input
            id="min_subtotal"
            name="min_subtotal"
            type="number"
            step="0.01"
            min="0"
            defaultValue={code?.min_subtotal ?? ""}
            placeholder="Sin mínimo"
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vigencia y límite
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="starts_at">Empieza</Label>
            <Input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              defaultValue={toLocalInput(code?.starts_at)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ends_at">Termina</Label>
            <Input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              defaultValue={toLocalInput(code?.ends_at)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="usage_limit">Límite total de usos</Label>
            <Input
              id="usage_limit"
              name="usage_limit"
              type="number"
              min="1"
              step="1"
              defaultValue={code?.usage_limit ?? ""}
              placeholder="Sin límite"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Deja fechas en blanco para que el código no expire. El contador de
          usos se incrementa cada vez que se crea un pedido con este código.
        </p>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="active" defaultChecked={code ? code.active : true} />
        Activo
      </label>

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton edit={Boolean(code)} />
      </div>
    </form>
  );
}

function SubmitButton({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : edit ? "Guardar cambios" : "Crear código"}
    </Button>
  );
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
