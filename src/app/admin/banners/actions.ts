"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

const BannerSchema = z
  .object({
    title: z.string().min(2),
    subtitle: z.string().optional().nullable(),
    image_url: z.string().min(1, "Sube una imagen"),
    link_url: z.string().optional().nullable(),
    position: z.enum(["hero", "strip", "category", "carousel"]),
    sort_order: z.coerce.number().int().optional(),
    active: z.coerce.boolean().optional(),
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    home_section_id: z.string().uuid().optional().nullable(),
  })
  .refine(
    (b) => b.position !== "category" || Boolean(b.category_id),
    {
      message: "Selecciona una categoría para banners de tipo 'categoría'",
      path: ["category_id"],
    },
  )
  .refine(
    (b) => b.position !== "carousel" || Boolean(b.home_section_id),
    {
      message: "Selecciona el carrusel al que pertenece este banner",
      path: ["home_section_id"],
    },
  );

export type BannerActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

function parseForm(formData: FormData) {
  const position = formData.get("position");
  // Only persist category_id / home_section_id when the position type uses
  // them; otherwise null them out so stale links don't survive when the
  // admin flips a banner between positions.
  const categoryId =
    position === "category" && formData.get("category_id")
      ? String(formData.get("category_id"))
      : null;
  const homeSectionId =
    position === "carousel" && formData.get("home_section_id")
      ? String(formData.get("home_section_id"))
      : null;

  return BannerSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || null,
    image_url: formData.get("image_url"),
    link_url: formData.get("link_url") || null,
    position,
    sort_order: formData.get("sort_order") || 0,
    active: formData.get("active") === "on",
    starts_at: formData.get("starts_at") || null,
    ends_at: formData.get("ends_at") || null,
    category_id: categoryId,
    home_section_id: homeSectionId,
  });
}

export async function createBannerAction(
  _prev: BannerActionState | undefined,
  formData: FormData,
): Promise<BannerActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("banners").insert(parsed.data);
  if (error) return { message: error.message };

  revalidatePath("/admin/banners");
  revalidatePath("/", "layout");
  redirect("/admin/banners");
}

export async function updateBannerAction(
  id: string,
  _prev: BannerActionState | undefined,
  formData: FormData,
): Promise<BannerActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("banners")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { message: error.message };

  revalidatePath("/admin/banners");
  revalidatePath("/", "layout");
  redirect("/admin/banners");
}

export async function deleteBannerAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("banners").delete().eq("id", id);
  revalidatePath("/admin/banners");
  revalidatePath("/", "layout");
}

export async function toggleBannerActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("banners").update({ active }).eq("id", id);
  revalidatePath("/admin/banners");
  revalidatePath("/", "layout");
}
