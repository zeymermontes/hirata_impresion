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
  createPromotionAction,
  updatePromotionAction,
  type PromotionActionState,
} from "@/app/admin/promociones/actions";
import { cn } from "@/lib/utils";

type PromotionRule = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  type: "free_shipping" | "percent_off" | "amount_off";
  discount_value: number;
  min_subtotal: number | null;
  scope: "all" | "products" | "categories";
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  active: boolean;
};

type IdName = { id: string; name: string };

type Props = {
  rule?: PromotionRule;
  selectedProductIds?: string[];
  selectedCategoryIds?: string[];
  products: IdName[];
  categories: IdName[];
};

export function PromotionForm({
  rule,
  selectedProductIds = [],
  selectedCategoryIds = [],
  products,
  categories,
}: Props) {
  const action = rule
    ? updatePromotionAction.bind(null, rule.id)
    : createPromotionAction;
  const [state, formAction] = useActionState<
    PromotionActionState | undefined,
    FormData
  >(action, undefined);

  const [type, setType] = useState<PromotionRule["type"]>(
    rule?.type ?? "free_shipping",
  );
  const [scope, setScope] = useState<PromotionRule["scope"]>(
    rule?.scope ?? "all",
  );
  const [productSet, setProductSet] = useState<Set<string>>(
    new Set(selectedProductIds),
  );
  const [categorySet, setCategorySet] = useState<Set<string>>(
    new Set(selectedCategoryIds),
  );

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Nombre interno</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={rule?.name ?? ""}
            placeholder="Ej. Envío gratis verano 2026"
          />
          {state?.errors?.name?.[0] ? (
            <p className="text-xs text-destructive">{state.errors.name[0]}</p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="label">Etiqueta visible al cliente</Label>
          <Input
            id="label"
            name="label"
            required
            defaultValue={rule?.label ?? ""}
            placeholder="Ej. ¡Envío gratis al superar $500!"
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
          defaultValue={rule?.description ?? ""}
          placeholder="Notas para el equipo"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="type">Tipo</Label>
          <Select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as PromotionRule["type"])}
          >
            <option value="free_shipping">Envío gratis</option>
            <option value="percent_off">% de descuento</option>
            <option value="amount_off">Descuento fijo ($)</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="discount_value">
            {type === "free_shipping"
              ? "Valor (no aplica)"
              : type === "percent_off"
                ? "Porcentaje (0-100)"
                : "Monto ($)"}
          </Label>
          <Input
            id="discount_value"
            name="discount_value"
            type="number"
            step={type === "percent_off" ? "1" : "0.01"}
            min="0"
            max={type === "percent_off" ? "100" : undefined}
            defaultValue={rule?.discount_value ?? 0}
            disabled={type === "free_shipping"}
          />
          {state?.errors?.discount_value?.[0] ? (
            <p className="text-xs text-destructive">
              {state.errors.discount_value[0]}
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
            defaultValue={rule?.min_subtotal ?? ""}
            placeholder="Sin mínimo"
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alcance
        </legend>
        <div className="grid gap-1.5">
          <Label htmlFor="scope">¿A qué se aplica el descuento?</Label>
          <Select
            id="scope"
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as PromotionRule["scope"])}
          >
            <option value="all">Todo el carrito</option>
            <option value="products">Productos específicos</option>
            <option value="categories">Categorías específicas</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Para &quot;Envío gratis&quot; el alcance no cambia el comportamiento
            — la promo aplica al envío del pedido al cumplir el mínimo de
            compra.
          </p>
        </div>

        {scope === "products" ? (
          <ScopePicker
            label="Productos incluidos"
            options={products}
            selected={productSet}
            onToggle={(id) => toggle(productSet, id, setProductSet)}
            inputName="product_ids"
          />
        ) : null}

        {scope === "categories" ? (
          <ScopePicker
            label="Categorías incluidas"
            options={categories}
            selected={categorySet}
            onToggle={(id) => toggle(categorySet, id, setCategorySet)}
            inputName="category_ids"
          />
        ) : null}
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vigencia
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="starts_at">Empieza</Label>
            <Input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              defaultValue={toLocalInput(rule?.starts_at)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ends_at">Termina</Label>
            <Input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              defaultValue={toLocalInput(rule?.ends_at)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Deja en blanco para promos sin fecha límite. La fecha se evalúa cada
          vez que un cliente carga el carrito o checkout.
        </p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="sort_order">Orden de prioridad</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={rule?.sort_order ?? 0}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <Checkbox
            name="active"
            defaultChecked={rule ? rule.active : true}
          />
          Activa
        </label>
      </div>

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton edit={Boolean(rule)} />
      </div>
    </form>
  );
}

function ScopePicker({
  label,
  options,
  selected,
  onToggle,
  inputName,
}: {
  label: string;
  options: IdName[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  inputName: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {options.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          No hay opciones creadas todavía.
        </p>
      ) : (
        <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-md border border-border bg-background p-2 sm:grid-cols-2">
          {options.map((opt) => {
            const checked = selected.has(opt.id);
            return (
              <label
                key={opt.id}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1 text-sm",
                  checked && "bg-primary/10",
                )}
              >
                <Checkbox
                  name={inputName}
                  value={opt.id}
                  checked={checked}
                  onChange={() => onToggle(opt.id)}
                />
                <span className="truncate">{opt.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubmitButton({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : edit ? "Guardar cambios" : "Crear promoción"}
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
