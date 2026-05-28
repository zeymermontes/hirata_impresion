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
  createBannerAction,
  updateBannerAction,
  type BannerActionState,
} from "@/app/admin/banners/actions";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  position: "hero" | "strip" | "category" | "carousel";
  sort_order: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  category_id: string | null;
  home_section_id: string | null;
};

// Per-position recommended dimensions, derived from the aspect ratios each
// surface actually uses on the landing/category pages. Keep these in sync
// with the renderers in `src/app/(storefront)/page.tsx` and the category
// header.
const BANNER_IMAGE_HINTS: Record<Banner["position"], string> = {
  hero: "Recomendado: 1200×900 px (4:3). PNG, JPG o WEBP — máx 5 MB.",
  strip: "Recomendado: 800×400 px (2:1). PNG, JPG o WEBP — máx 5 MB.",
  category:
    "Recomendado: 1600×600 px (~16:6 panorámico). PNG, JPG o WEBP — máx 5 MB.",
  carousel:
    "Recomendado: 1920×600 px (16:5 panorámico, full-width). PNG, JPG o WEBP — máx 5 MB.",
};

type Category = { id: string; name: string };
type CarouselSection = { id: string; name: string };

export function BannerForm({
  banner,
  categories,
  carousels,
}: {
  banner?: Banner;
  categories: Category[];
  carousels: CarouselSection[];
}) {
  const action = banner
    ? updateBannerAction.bind(null, banner.id)
    : createBannerAction;

  const [state, formAction] = useActionState<
    BannerActionState | undefined,
    FormData
  >(action, undefined);

  const [position, setPosition] = useState<Banner["position"]>(
    banner?.position ?? "hero",
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={banner?.title ?? ""}
        />
        {state?.errors?.title?.[0] ? (
          <p className="text-xs text-destructive">{state.errors.title[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="subtitle">Subtítulo</Label>
        <Textarea
          id="subtitle"
          name="subtitle"
          rows={2}
          defaultValue={banner?.subtitle ?? ""}
        />
      </div>

      <ImageUpload
        name="image_url"
        defaultValue={banner?.image_url}
        folder="banners"
        label="Imagen del banner"
        aspect={position === "hero" ? "video" : "wide"}
        hint={BANNER_IMAGE_HINTS[position]}
      />
      {state?.errors?.image_url?.[0] ? (
        <p className="text-xs text-destructive">{state.errors.image_url[0]}</p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="link_url">URL de destino (opcional)</Label>
        <Input
          id="link_url"
          name="link_url"
          placeholder="/productos?categoria=lonas"
          defaultValue={banner?.link_url ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="position">Posición</Label>
          <Select
            id="position"
            name="position"
            value={position}
            onChange={(e) => setPosition(e.target.value as Banner["position"])}
            required
          >
            <option value="hero">Hero (principal)</option>
            <option value="strip">Strip (banda de promos)</option>
            <option value="category">Categoría</option>
            <option value="carousel">Carrusel (asignar a sección)</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sort_order">Orden</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={banner?.sort_order ?? 0}
          />
        </div>
      </div>

      {position === "category" ? (
        <div className="grid gap-2">
          <Label htmlFor="category_id">¿En qué categoría se muestra?</Label>
          <Select
            id="category_id"
            name="category_id"
            defaultValue={banner?.category_id ?? ""}
            required
          >
            <option value="">— elegir categoría —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Aparecerá en la parte superior de{" "}
            <code>/productos?categoria=&lt;slug&gt;</code>. Si agregas varios
            banners a la misma categoría, se mostrarán como carrusel.
          </p>
          {state?.errors?.category_id?.[0] ? (
            <p className="text-xs text-destructive">
              {state.errors.category_id[0]}
            </p>
          ) : null}
        </div>
      ) : null}

      {position === "carousel" ? (
        <div className="grid gap-2">
          <Label htmlFor="home_section_id">¿En qué carrusel del landing?</Label>
          {carousels.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Todavía no hay carruseles creados. Ve a{" "}
              <strong>Landing</strong> y agrega una sección tipo{" "}
              <em>Carrusel de banners</em> antes de asignar banners aquí.
            </p>
          ) : (
            <>
              <Select
                id="home_section_id"
                name="home_section_id"
                defaultValue={banner?.home_section_id ?? ""}
                required
              >
                <option value="">— elegir carrusel —</option>
                {carousels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                El nombre viene del título de la sección. Si necesitas un
                carrusel nuevo, créalo desde <strong>Landing</strong>.
              </p>
              {state?.errors?.home_section_id?.[0] ? (
                <p className="text-xs text-destructive">
                  {state.errors.home_section_id[0]}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="starts_at">Empieza a mostrarse</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={toLocalInput(banner?.starts_at)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ends_at">Termina de mostrarse</Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={toLocalInput(banner?.ends_at)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="active" defaultChecked={banner ? banner.active : true} />
        Activo
      </label>

      {state?.message ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton label={banner ? "Guardar cambios" : "Crear banner"} />
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

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
