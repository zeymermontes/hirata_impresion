"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";
import type { Json } from "@/lib/supabase/database.types";

const SECTION_TYPES = [
  "hero_banners",
  "featured_products",
  "category_grid",
  "banner_strip",
  "custom_html",
] as const;

const SectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  title: z.string().optional().nullable(),
  config: z.record(z.string(), z.unknown()).default({}),
  active: z.coerce.boolean().optional(),
});

export type SectionActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

function buildConfig(type: string, formData: FormData): Record<string, unknown> {
  switch (type) {
    case "hero_banners":
      return { position: "hero" };
    case "banner_strip":
      return { position: "strip" };
    case "featured_products": {
      const limit = Number(formData.get("limit"));
      return { limit: Number.isFinite(limit) && limit > 0 ? limit : 8 };
    }
    case "category_grid": {
      const limit = Number(formData.get("limit"));
      return { limit: Number.isFinite(limit) && limit > 0 ? limit : 6 };
    }
    case "custom_html":
      return { html: String(formData.get("html") ?? "") };
    default:
      return {};
  }
}

export async function addSectionAction(
  _prev: SectionActionState | undefined,
  formData: FormData,
): Promise<SectionActionState> {
  return runAction(async () => {
    const type = String(formData.get("type") ?? "");
    const parsed = SectionSchema.safeParse({
      type,
      title: formData.get("title") || null,
      config: buildConfig(type, formData),
      active: true,
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();

    const { data: last } = await supabase
      .from("home_sections")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSortOrder = (last?.sort_order ?? -1) + 1;

    const { error } = await supabase.from("home_sections").insert({
      type: parsed.data.type,
      title: parsed.data.title ?? null,
      config: (parsed.data.config ?? {}) as Json,
      active: parsed.data.active ?? true,
      sort_order: nextSortOrder,
    });
    if (error) return { message: error.message };

    revalidatePath("/admin/secciones");
    revalidatePath("/", "layout");
    return {};
  });
}

export async function updateSectionAction(
  id: string,
  _prev: SectionActionState | undefined,
  formData: FormData,
): Promise<SectionActionState> {
  return runAction(async () => {
    const type = String(formData.get("type") ?? "");
    const parsed = SectionSchema.safeParse({
      type,
      title: formData.get("title") || null,
      config: buildConfig(type, formData),
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("home_sections")
      .update({
        type: parsed.data.type,
        title: parsed.data.title ?? null,
        config: (parsed.data.config ?? {}) as Json,
      })
      .eq("id", id);
    if (error) return { message: error.message };

    revalidatePath("/admin/secciones");
    revalidatePath("/", "layout");
    return {};
  });
}

export async function deleteSectionAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("home_sections").delete().eq("id", id);
  revalidatePath("/admin/secciones");
  revalidatePath("/", "layout");
}

export async function toggleSectionActiveAction(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("home_sections").update({ active }).eq("id", id);
  revalidatePath("/admin/secciones");
  revalidatePath("/", "layout");
}

export async function reorderSectionsAction(orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const { supabase } = await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("home_sections").update({ sort_order: index }).eq("id", id),
    ),
  );
  revalidatePath("/admin/secciones");
  revalidatePath("/", "layout");
}
