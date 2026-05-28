"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/image-upload";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/app/admin/categorias/actions";
import { slugify } from "@/lib/slugify";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  show_in_header: boolean;
};

type Props = {
  category?: Category;
  parents: { id: string; name: string }[];
};

export function CategoryForm({ category, parents }: Props) {
  const action = category
    ? updateCategoryAction.bind(null, category.id)
    : createCategoryAction;

  const [state, formAction] = useActionState<
    CategoryActionState | undefined,
    FormData
  >(action, undefined);

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (!slugTouched) setSlug(slugify(v));
          }}
        />
        {state?.errors?.name?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Slug (URL)</Label>
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
        <p className="text-xs text-muted-foreground">
          Se usará en la URL: <code>/productos?categoria={slug || "..."}</code>
        </p>
        {state?.errors?.slug?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.slug[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={category?.description ?? ""}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="parent_id">Categoría padre (opcional)</Label>
          <Select
            id="parent_id"
            name="parent_id"
            defaultValue={category?.parent_id ?? ""}
          >
            <option value="">Sin padre (raíz)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sort_order">Orden</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={category?.sort_order ?? 0}
          />
        </div>
      </div>

      <ImageUpload
        name="image_url"
        defaultValue={category?.image_url ?? undefined}
        folder="categories"
        label="Imagen de portada (opcional)"
        aspect="video"
        hint="Recomendado: 800×600 px (4:3). Aparece como tarjeta en el grid de categorías del landing. PNG, JPG o WEBP — máx 5 MB."
      />

      <label className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
        <Checkbox
          name="show_in_header"
          defaultChecked={category?.show_in_header ?? false}
        />
        <span>
          <span className="font-medium">Mostrar en el header</span>
          <span className="block text-xs text-muted-foreground">
            La categoría aparecerá como link en la navegación principal del
            sitio. Recomendado solo para 3–5 categorías top.
          </span>
        </span>
      </label>

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton label={category ? "Guardar cambios" : "Crear categoría"} />
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
