"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  addVariantAction,
  deleteVariantAction,
  reorderVariantsAction,
  updateVariantAction,
  type VariantActionState,
} from "@/app/admin/productos/actions";
import { cn, formatMXN } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  price_delta: number;
  sku: string | null;
  stock: number | null;
  sort_order: number;
};

export function VariantsSection({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const [items, setItems] = useState<Variant[]>(variants);
  const [lastSeenVariants, setLastSeenVariants] = useState(variants);
  const [, startTransition] = useTransition();

  // Sync local state when the server prop changes (after revalidatePath).
  // React's recommended pattern: compare-and-set during render, not in effect.
  if (variants !== lastSeenVariants) {
    setLastSeenVariants(variants);
    setItems(variants);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    startTransition(() => {
      reorderVariantsAction(
        productId,
        next.map((v) => v.id),
      );
    });
  }

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[2rem_2fr_1fr_1fr_1fr_5rem] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span />
            <span>Nombre</span>
            <span>Δ Precio</span>
            <span>SKU</span>
            <span>Stock</span>
            <span className="text-right">Acciones</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-border bg-background">
                {items.map((v) => (
                  <SortableVariantRow
                    key={v.id}
                    productId={productId}
                    variant={v}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Sin variantes. Si tu producto tiene tamaños, acabados u otras
          opciones que cambian el precio, agrégalas abajo.
        </p>
      )}

      <AddVariantForm productId={productId} />
    </div>
  );
}

function SortableVariantRow({
  productId,
  variant,
}: {
  productId: string;
  variant: Variant;
}) {
  const [editing, setEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variant.id, disabled: editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (editing) {
    return (
      <li ref={setNodeRef} style={style} className="bg-muted/30">
        <EditVariantForm
          productId={productId}
          variant={variant}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[2rem_2fr_1fr_1fr_1fr_5rem] items-center gap-3 px-3 py-2 hover:bg-muted/20",
        isDragging && "z-10 bg-background shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="truncate text-sm font-medium">{variant.name}</span>
      <span className="text-sm">
        {Number(variant.price_delta) > 0 ? "+" : ""}
        {formatMXN(Number(variant.price_delta))}
      </span>
      <span className="truncate font-mono text-xs text-muted-foreground">
        {variant.sku ?? "—"}
      </span>
      <span className="text-sm">{variant.stock ?? "∞"}</span>
      <div className="flex items-center justify-end gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <DeleteVariantButton productId={productId} variantId={variant.id} />
      </div>
    </li>
  );
}

function EditVariantForm({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant: Variant;
  onDone: () => void;
}) {
  const updateBound = updateVariantAction.bind(null, productId, variant.id);
  const [state, formAction] = useActionState<
    VariantActionState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await updateBound(prev, formData);
    if (!result?.errors && !result?.message) onDone();
    return result;
  }, undefined);

  return (
    <form
      action={formAction}
      className="grid grid-cols-[2rem_2fr_1fr_1fr_1fr_5rem] items-end gap-3 px-3 py-3"
    >
      <div />
      <div className="grid gap-1">
        <Label htmlFor={`edit-name-${variant.id}`} className="text-xs">
          Nombre
        </Label>
        <Input
          id={`edit-name-${variant.id}`}
          name="name"
          defaultValue={variant.name}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`edit-price-${variant.id}`} className="text-xs">
          Δ Precio
        </Label>
        <Input
          id={`edit-price-${variant.id}`}
          name="price_delta"
          type="number"
          step="0.01"
          defaultValue={Number(variant.price_delta)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`edit-sku-${variant.id}`} className="text-xs">
          SKU
        </Label>
        <Input
          id={`edit-sku-${variant.id}`}
          name="sku"
          defaultValue={variant.sku ?? ""}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`edit-stock-${variant.id}`} className="text-xs">
          Stock
        </Label>
        <Input
          id={`edit-stock-${variant.id}`}
          name="stock"
          type="number"
          defaultValue={variant.stock ?? ""}
        />
      </div>
      <div className="flex items-center justify-end gap-1">
        <SaveButton />
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancelar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {state?.message ? (
        <p className="col-span-6 text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Guardar"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      <Check className="h-4 w-4" />
    </button>
  );
}

function DeleteVariantButton({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  const action = deleteVariantAction.bind(null, productId, variantId);
  return (
    <form action={action}>
      <button
        type="submit"
        aria-label="Eliminar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          if (!confirm("¿Eliminar esta variante?")) e.preventDefault();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

function AddVariantForm({ productId }: { productId: string }) {
  const bound = addVariantAction.bind(null, productId);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<
    VariantActionState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await bound(prev, formData);
    if (result && !result.errors && !result.message) {
      formRef.current?.reset();
    }
    return result;
  }, undefined);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-md border border-border bg-background p-4 sm:grid-cols-5"
    >
      <div className="grid gap-1 sm:col-span-2">
        <Label htmlFor="variant-name" className="text-xs">
          Nombre
        </Label>
        <Input
          id="variant-name"
          name="name"
          required
          placeholder="Ej. Tamaño A4 / Mate"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="variant-price" className="text-xs">
          Δ Precio
        </Label>
        <Input
          id="variant-price"
          name="price_delta"
          type="number"
          step="0.01"
          defaultValue="0"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="variant-sku" className="text-xs">
          SKU
        </Label>
        <Input id="variant-sku" name="sku" placeholder="opcional" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="variant-stock" className="text-xs">
          Stock
        </Label>
        <Input
          id="variant-stock"
          name="stock"
          type="number"
          placeholder="∞"
        />
      </div>
      <div className="sm:col-span-5 flex items-center justify-between">
        {state?.message ? (
          <p className="text-xs text-destructive">{state.message}</p>
        ) : (
          <span />
        )}
        <AddVariantButton />
      </div>
    </form>
  );
}

function AddVariantButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
      <Plus className="h-3.5 w-3.5" />
      {pending ? "Agregando..." : "Agregar variante"}
    </Button>
  );
}
