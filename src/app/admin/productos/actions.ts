"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";
import { slugify } from "@/lib/slugify";

// ============================================================
// Product
// ============================================================

const ProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug inválido"),
  description: z.string().optional().nullable(),
  base_price: z.coerce.number().nonnegative(),
  category_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "active", "archived"]),
  is_customizable: z.coerce.boolean().optional(),
  requires_file: z.coerce.boolean().optional(),
  images: z.array(z.string()).default([]),
});

export type ProductActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

type ParsedProductForm = {
  data: z.infer<typeof ProductSchema>;
  additionalCategoryIds: string[];
};

function parseProductForm(
  formData: FormData,
):
  | { success: true; parsed: ParsedProductForm }
  | { success: false; errors: Record<string, string[] | undefined> } {
  const imagesRaw = formData.get("images");
  let images: string[] = [];
  if (typeof imagesRaw === "string" && imagesRaw.length > 0) {
    try {
      const arr = JSON.parse(imagesRaw);
      if (Array.isArray(arr)) images = arr.filter((x) => typeof x === "string");
    } catch {
      images = [];
    }
  }

  // Multi-select sends repeated `additional_category_ids` entries via FormData.
  const additionalCategoryIds = formData
    .getAll("additional_category_ids")
    .map((v) => String(v))
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v));

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(String(formData.get("name") ?? "")),
    description: formData.get("description") || null,
    base_price: formData.get("base_price") || 0,
    category_id: formData.get("category_id") || null,
    status: formData.get("status") || "draft",
    is_customizable: formData.get("is_customizable") === "on",
    requires_file: formData.get("requires_file") === "on",
    images,
  });
  if (!parsed.success) {
    return { success: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  // Don't store the primary category twice — strip it from the additional list.
  const additional = parsed.data.category_id
    ? additionalCategoryIds.filter((id) => id !== parsed.data.category_id)
    : additionalCategoryIds;

  return {
    success: true,
    parsed: { data: parsed.data, additionalCategoryIds: additional },
  };
}

async function syncProductCategories(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  productId: string,
  additionalCategoryIds: string[],
) {
  // Replace the set: easier than diffing for a small set of categories.
  await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", productId);
  if (additionalCategoryIds.length === 0) return;
  await supabase.from("product_categories").insert(
    additionalCategoryIds.map((category_id) => ({
      product_id: productId,
      category_id,
    })),
  );
}

export async function createProductAction(
  _prev: ProductActionState | undefined,
  formData: FormData,
): Promise<ProductActionState> {
  return runAction(async () => {
    const result = parseProductForm(formData);
    if (!result.success) return { errors: result.errors };
    const { data: payload, additionalCategoryIds } = result.parsed;

    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { message: error.message };

    await syncProductCategories(supabase, data.id, additionalCategoryIds);

    revalidatePath("/admin/productos");
    revalidatePath("/", "layout");
    redirect(`/admin/productos/${data.id}`);
  });
}

export async function updateProductAction(
  id: string,
  _prev: ProductActionState | undefined,
  formData: FormData,
): Promise<ProductActionState> {
  return runAction(async () => {
    const result = parseProductForm(formData);
    if (!result.success) return { errors: result.errors };
    const { data: payload, additionalCategoryIds } = result.parsed;

    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id);
    if (error) return { message: error.message };

    await syncProductCategories(supabase, id, additionalCategoryIds);

    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${id}`);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function deleteProductAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
}

// ============================================================
// Variants
// ============================================================

const VariantSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(1),
  price_delta: z.coerce.number().default(0),
  sku: z.string().optional().nullable(),
  stock: z.coerce.number().int().optional().nullable(),
});

export type VariantActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

export async function addVariantAction(
  productId: string,
  _prev: VariantActionState | undefined,
  formData: FormData,
): Promise<VariantActionState> {
  return runAction(async () => {
    const parsed = VariantSchema.safeParse({
      product_id: productId,
      name: formData.get("name"),
      price_delta: formData.get("price_delta") || 0,
      sku: formData.get("sku") || null,
      stock: formData.get("stock") || null,
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();

    // Place the new variant at the end of the list — needed for reorder to
    // behave correctly (it relies on monotonically increasing sort_order).
    const { data: last } = await supabase
      .from("product_variants")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSortOrder = (last?.sort_order ?? -1) + 1;

    const { error } = await supabase
      .from("product_variants")
      .insert({ ...parsed.data, sort_order: nextSortOrder });
    if (error) return { message: error.message };

    revalidatePath(`/admin/productos/${productId}`);
    return {};
  });
}

export async function deleteVariantAction(productId: string, variantId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("product_variants").delete().eq("id", variantId);
  revalidatePath(`/admin/productos/${productId}`);
}

const VariantUpdateSchema = z.object({
  name: z.string().min(1),
  price_delta: z.coerce.number().default(0),
  sku: z.string().optional().nullable(),
  stock: z.coerce.number().int().optional().nullable(),
});

export async function updateVariantAction(
  productId: string,
  variantId: string,
  _prev: VariantActionState | undefined,
  formData: FormData,
): Promise<VariantActionState> {
  return runAction(async () => {
    const parsed = VariantUpdateSchema.safeParse({
      name: formData.get("name"),
      price_delta: formData.get("price_delta") || 0,
      sku: formData.get("sku") || null,
      stock:
        formData.get("stock") === "" || formData.get("stock") === null
          ? null
          : formData.get("stock"),
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("product_variants")
      .update(parsed.data)
      .eq("id", variantId);
    if (error) return { message: error.message };

    revalidatePath(`/admin/productos/${productId}`);
    return {};
  });
}

/**
 * Persist the new variant order. Writes `sort_order = index` for each id in
 * `orderedIds`, scoped to the given product (so it can't be used to reorder
 * variants of another product).
 */
export async function reorderVariantsAction(
  productId: string,
  orderedIds: string[],
) {
  if (orderedIds.length === 0) return;
  const { supabase } = await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("product_variants")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("product_id", productId),
    ),
  );
  revalidatePath(`/admin/productos/${productId}`);
}

// ============================================================
// Customization fields
// ============================================================

const CustomFieldSchema = z.object({
  product_id: z.string().uuid(),
  type: z.enum(["text", "textarea", "number", "dropdown", "file"]),
  name: z
    .string()
    .min(1)
    .regex(/^[a-z_][a-z0-9_]*$/, "Solo a-z, 0-9 y _"),
  label: z.string().min(1),
  required: z.coerce.boolean().optional(),
  options: z.array(z.string()).default([]),
  price_delta_rules: z.record(z.string(), z.coerce.number()).optional().nullable(),
});

export type CustomFieldActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

function parseOptionsTextarea(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePriceRules(
  options: string[],
  formData: FormData,
): Record<string, number> | null {
  const out: Record<string, number> = {};
  let anySet = false;
  for (const opt of options) {
    const raw = formData.get(`price_delta__${opt}`);
    if (raw === null || raw === "") continue;
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      out[opt] = n;
      anySet = true;
    }
  }
  return anySet ? out : null;
}

export async function addCustomizationFieldAction(
  productId: string,
  _prev: CustomFieldActionState | undefined,
  formData: FormData,
): Promise<CustomFieldActionState> {
  return runAction(async () => {
    const options = parseOptionsTextarea(formData.get("options"));
    const parsed = CustomFieldSchema.safeParse({
      product_id: productId,
      type: formData.get("type"),
      name: formData.get("name"),
      label: formData.get("label"),
      required: formData.get("required") === "on",
      options,
      price_delta_rules: parsePriceRules(options, formData),
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }

    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("customization_fields").insert({
      product_id: parsed.data.product_id,
      type: parsed.data.type,
      name: parsed.data.name,
      label: parsed.data.label,
      required: parsed.data.required ?? false,
      options:
        parsed.data.type === "dropdown" ? parsed.data.options : null,
      price_delta_rules: parsed.data.price_delta_rules ?? null,
    });
    if (error) return { message: error.message };

    revalidatePath(`/admin/productos/${productId}`);
    revalidatePath(`/admin/productos/${productId}/personalizacion`);
    return {};
  });
}

export async function deleteCustomizationFieldAction(
  productId: string,
  fieldId: string,
) {
  const { supabase } = await requireAdmin();
  await supabase.from("customization_fields").delete().eq("id", fieldId);
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath(`/admin/productos/${productId}/personalizacion`);
}

// ============================================================
// Template config (zones)
// ============================================================

const ZoneSchema = z.object({
  field: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  font_family: z.string().optional(),
  font_size: z.number().positive().optional(),
  font_weight: z.string().optional(),
  color: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

const TemplateConfigSchema = z.object({
  template_url: z.string().min(1),
  canvas_width: z.number().positive(),
  canvas_height: z.number().positive(),
  zones: z.array(ZoneSchema).default([]),
});

export type Zone = z.infer<typeof ZoneSchema>;
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

export type TemplateActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

export async function saveTemplateConfigAction(
  productId: string,
  _prev: TemplateActionState | undefined,
  formData: FormData,
): Promise<TemplateActionState> {
  return runAction(async () => {
    const raw = formData.get("template_config");
    if (typeof raw !== "string") {
      return { message: "Datos inválidos" };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { message: "JSON inválido" };
    }

    const parsed = TemplateConfigSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { message: "Configuración de plantilla inválida" };
    }

    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("products")
      .update({ template_config: parsed.data })
      .eq("id", productId);
    if (error) return { message: error.message };

    revalidatePath(`/admin/productos/${productId}`);
    revalidatePath(`/admin/productos/${productId}/personalizacion`);
    revalidatePath("/", "layout");
    return { ok: true, message: "Plantilla guardada." };
  });
}

export async function clearTemplateConfigAction(productId: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("products")
    .update({ template_config: null })
    .eq("id", productId);
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath(`/admin/productos/${productId}/personalizacion`);
}
