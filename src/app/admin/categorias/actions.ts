"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slugify";

const CategorySchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Solo a-z, 0-9 y guiones"),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  image_url: z.string().optional().nullable(),
  sort_order: z.coerce.number().int().optional(),
  show_in_header: z.coerce.boolean().optional(),
});

export type CategoryActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

function parseForm(formData: FormData) {
  return CategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(String(formData.get("name") ?? "")),
    description: formData.get("description") || null,
    parent_id: formData.get("parent_id") || null,
    image_url: formData.get("image_url") || null,
    sort_order: formData.get("sort_order") || 0,
    show_in_header: formData.get("show_in_header") === "on",
  });
}

export async function createCategoryAction(
  _prev: CategoryActionState | undefined,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) return { message: error.message };

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  redirect("/admin/categorias");
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryActionState | undefined,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { message: error.message };

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  redirect("/admin/categorias");
}

export async function deleteCategoryAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
}
