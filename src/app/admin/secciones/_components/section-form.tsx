"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import {
  addSectionAction,
  updateSectionAction,
  type SectionActionState,
} from "@/app/admin/secciones/actions";

export type SectionType =
  | "hero_banners"
  | "featured_products"
  | "category_grid"
  | "banner_strip"
  | "custom_html";

export const SECTION_TYPE_LABEL: Record<SectionType, string> = {
  hero_banners: "Banners principales (hero)",
  featured_products: "Productos destacados",
  category_grid: "Grid de categorías",
  banner_strip: "Banda de promociones",
  custom_html: "HTML personalizado",
};

export type Section = {
  id: string;
  type: SectionType;
  title: string | null;
  config: Record<string, unknown>;
  active: boolean;
  sort_order: number;
};

type Props = {
  section?: Section;
  onDone?: () => void;
};

export function SectionForm({ section, onDone }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<SectionType>(
    section?.type ?? "featured_products",
  );

  const bound = section
    ? updateSectionAction.bind(null, section.id)
    : addSectionAction;

  const [state, formAction] = useActionState<
    SectionActionState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await bound(prev, formData);
    if (result && !result.errors && !result.message) {
      if (onDone) onDone();
      else formRef.current?.reset();
    }
    return result;
  }, undefined);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="type">Tipo de sección</Label>
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as SectionType)}
        >
          {Object.entries(SECTION_TYPE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="title">Título visible (opcional)</Label>
        <Input
          id="title"
          name="title"
          defaultValue={section?.title ?? ""}
          placeholder="Ej. Productos destacados"
        />
      </div>

      <TypeConfigFields type={type} initial={section?.config ?? {}} />

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onDone ? (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
        ) : null}
        <SubmitButton edit={Boolean(section)} />
      </div>
    </form>
  );
}

function TypeConfigFields({
  type,
  initial,
}: {
  type: SectionType;
  initial: Record<string, unknown>;
}) {
  if (type === "featured_products" || type === "category_grid") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor="limit">
          {type === "featured_products"
            ? "Cuántos productos mostrar"
            : "Cuántas categorías mostrar"}
        </Label>
        <Input
          id="limit"
          name="limit"
          type="number"
          min={1}
          max={50}
          defaultValue={Number(initial.limit) || (type === "featured_products" ? 8 : 6)}
        />
      </div>
    );
  }
  if (type === "custom_html") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor="html">HTML</Label>
        <Textarea
          id="html"
          name="html"
          rows={6}
          defaultValue={String(initial.html ?? "")}
          placeholder="<div>Contenido HTML libre…</div>"
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Cuidado: este HTML se inyecta tal cual en la landing.
        </p>
      </div>
    );
  }
  if (type === "hero_banners") {
    return (
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          Configura el bloque principal de la landing. Si dejas la imagen
          vacía, se usa el primer banner activo de la sección{" "}
          <strong>Banners</strong> con posición <em>hero</em>.
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="hero_title">Título</Label>
          <Input
            id="hero_title"
            name="hero_title"
            defaultValue={String(initial.title ?? "")}
            placeholder="Ej. Imprime lo que imaginas, sin mínimos."
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hero_subtitle">Subtítulo / descripción</Label>
          <Textarea
            id="hero_subtitle"
            name="hero_subtitle"
            rows={2}
            defaultValue={String(initial.subtitle ?? "")}
            placeholder="Ej. Lonas, vinilos, papelería y rotulación…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Imagen del hero (opcional)</Label>
          <ImageUpload
            name="hero_image_url"
            defaultValue={String(initial.image_url ?? "")}
            folder="home"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="hero_primary_label">Botón principal · texto</Label>
            <Input
              id="hero_primary_label"
              name="hero_primary_label"
              defaultValue={String(initial.primary_label ?? "")}
              placeholder="Ver productos"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hero_primary_href">Botón principal · destino</Label>
            <Input
              id="hero_primary_href"
              name="hero_primary_href"
              defaultValue={String(initial.primary_href ?? "")}
              placeholder="/productos"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="hero_secondary_label">
              Botón secundario · texto
            </Label>
            <Input
              id="hero_secondary_label"
              name="hero_secondary_label"
              defaultValue={String(initial.secondary_label ?? "")}
              placeholder="Pedir cotización"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hero_secondary_href">
              Botón secundario · destino
            </Label>
            <Input
              id="hero_secondary_href"
              name="hero_secondary_href"
              defaultValue={String(initial.secondary_href ?? "")}
              placeholder="/contacto"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Para esconder un botón, déjalo sin texto. Los destinos pueden ser
          rutas internas (<code>/productos</code>) o URLs externas.
        </p>
      </div>
    );
  }
  // banner_strip uses banners from the dedicated table.
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
      Esta sección lee de la tabla de banners. Administra qué banners aparecen
      desde <strong>Banners</strong> en el menú lateral.
    </p>
  );
}

function SubmitButton({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando..." : edit ? "Guardar cambios" : "Agregar sección"}
    </Button>
  );
}
