"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiImageUpload } from "@/components/multi-image-upload";
import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/app/admin/productos/actions";
import { slugify } from "@/lib/slugify";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  category_id: string | null;
  status: "draft" | "active" | "archived";
  is_customizable: boolean;
  requires_file: boolean;
  images: unknown;
  is_gift_card?: boolean;
  gift_card_min_amount?: number | null;
  gift_card_max_amount?: number | null;
};

type Category = { id: string; name: string };

type Props = {
  product?: Product;
  categories: Category[];
  /** Ids of categories that this product belongs to (besides the primary). */
  additionalCategoryIds?: string[];
};

export function ProductForm({
  product,
  categories,
  additionalCategoryIds = [],
}: Props) {
  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;
  const [state, formAction] = useActionState<
    ProductActionState | undefined,
    FormData
  >(action, undefined);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>(
    product?.category_id ?? "",
  );
  const [extraCategoryIds, setExtraCategoryIds] = useState<Set<string>>(
    new Set(additionalCategoryIds),
  );
  // Drives which subsections of the form are visible. We persist this as
  // the existing `is_gift_card` boolean on the products table so adding new
  // product types later only needs another option here + a column.
  const [productType, setProductType] = useState<"regular" | "gift_card">(
    product?.is_gift_card ? "gift_card" : "regular",
  );
  const isGiftCard = productType === "gift_card";

  function toggleExtra(id: string) {
    setExtraCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const defaultImages = Array.isArray(product?.images)
    ? (product?.images as string[])
    : [];

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre del producto</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
        {state?.errors?.name?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Slug (URL del producto)</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          required
        />
        {state?.errors?.slug?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.slug[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={product?.description ?? ""}
        />
      </div>

      <fieldset className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Tipo de producto
        </legend>
        <Select
          id="product_type"
          value={productType}
          onChange={(e) =>
            setProductType(e.target.value as "regular" | "gift_card")
          }
        >
          <option value="regular">Producto regular</option>
          <option value="gift_card">Gift card</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isGiftCard
            ? "El cliente elige el monto en el checkout. No tiene precio base ni archivo."
            : "Producto físico o digital con precio base, variantes y campos de personalización opcionales."}
        </p>
        {/* Drives `is_gift_card` on the products table from the selector
            instead of a checkbox lower in the form. */}
        <input
          type="hidden"
          name="is_gift_card"
          value={isGiftCard ? "on" : ""}
        />
      </fieldset>

      <div
        className={
          isGiftCard
            ? "grid gap-4 sm:grid-cols-2"
            : "grid gap-4 sm:grid-cols-3"
        }
      >
        {isGiftCard ? null : (
          <div className="grid gap-2">
            <Label htmlFor="base_price">Precio base (MXN)</Label>
            <Input
              id="base_price"
              name="base_price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={product?.base_price ?? "0"}
            />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="category_id">Categoría principal</Label>
          <Select
            id="category_id"
            name="category_id"
            value={primaryCategoryId}
            onChange={(e) => setPrimaryCategoryId(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            id="status"
            name="status"
            defaultValue={product?.status ?? "draft"}
          >
            <option value="draft">Borrador (oculto)</option>
            <option value="active">Activo (visible en tienda)</option>
            <option value="archived">Archivado</option>
          </Select>
        </div>
        {/* Send base_price=0 server-side for gift cards so the column
            stays NOT NULL without showing the field. */}
        {isGiftCard ? (
          <input type="hidden" name="base_price" value="0" />
        ) : null}
      </div>

      <fieldset className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Categorías adicionales
        </legend>
        <p className="text-xs text-muted-foreground">
          Marca las categorías donde también quieres que aparezca este producto.
          La categoría principal de arriba se incluye automáticamente.
        </p>
        {categories.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            No hay categorías creadas todavía.
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {categories
              .filter((c) => c.id !== primaryCategoryId)
              .map((c) => {
                const checked = extraCategoryIds.has(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:border-primary"
                  >
                    <Checkbox
                      name="additional_category_ids"
                      value={c.id}
                      checked={checked}
                      onChange={() => toggleExtra(c.id)}
                    />
                    {c.name}
                  </label>
                );
              })}
          </div>
        )}
      </fieldset>

      {isGiftCard ? (
        <fieldset className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rango de monto de la gift card
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="gift_card_min_amount">Monto mínimo ($)</Label>
              <Input
                id="gift_card_min_amount"
                name="gift_card_min_amount"
                type="number"
                min={1}
                step={1}
                defaultValue={product?.gift_card_min_amount ?? 100}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gift_card_max_amount">Monto máximo ($)</Label>
              <Input
                id="gift_card_max_amount"
                name="gift_card_max_amount"
                type="number"
                min={1}
                step={1}
                defaultValue={product?.gift_card_max_amount ?? 10000}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            El cliente elegirá un monto dentro de este rango al comprar.
          </p>
        </fieldset>
      ) : (
        <fieldset className="space-y-2 rounded-md border border-border bg-muted/30 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Personalización
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="is_customizable"
              defaultChecked={product?.is_customizable ?? false}
            />
            Permite personalización en línea
            <span className="text-xs text-muted-foreground">
              (campos de texto, dropdowns, etc. — se configuran en Fase 3)
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="requires_file"
              defaultChecked={product?.requires_file ?? false}
            />
            El cliente debe subir un archivo
          </label>
        </fieldset>
      )}

      <MultiImageUpload
        name="images"
        defaultValue={defaultImages}
        folder="products"
        label="Imágenes del producto"
        max={6}
        hint="Recomendado: 1200×1200 px (cuadradas). La primera es la principal del catálogo. PNG, JPG o WEBP — máx 5 MB c/u."
      />

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton label={product ? "Guardar cambios" : "Crear producto"} />
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
