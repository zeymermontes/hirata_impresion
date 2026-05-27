"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";

const PromotionSchema = z
  .object({
    name: z.string().min(2),
    label: z.string().min(2),
    description: z.string().optional().nullable(),
    type: z.enum(["free_shipping", "percent_off", "amount_off"]),
    discount_value: z.coerce.number().min(0),
    min_subtotal: z
      .union([z.literal(""), z.coerce.number().nonnegative()])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    scope: z.enum(["all", "products", "categories"]),
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    sort_order: z.coerce.number().int().optional(),
    active: z.coerce.boolean().optional(),
  })
  .refine(
    (v) =>
      v.type !== "percent_off" ||
      (v.discount_value > 0 && v.discount_value <= 100),
    {
      message: "El porcentaje debe estar entre 0 y 100",
      path: ["discount_value"],
    },
  )
  .refine(
    (v) => v.type !== "amount_off" || v.discount_value > 0,
    {
      message: "Ingresa un monto mayor a 0",
      path: ["discount_value"],
    },
  );

export type PromotionActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

function parseForm(formData: FormData) {
  return PromotionSchema.safeParse({
    name: formData.get("name"),
    label: formData.get("label"),
    description: formData.get("description") || null,
    type: formData.get("type"),
    discount_value: formData.get("discount_value") || 0,
    min_subtotal:
      formData.get("min_subtotal") === null ||
      formData.get("min_subtotal") === ""
        ? ""
        : formData.get("min_subtotal"),
    scope: formData.get("scope") || "all",
    starts_at: formData.get("starts_at") || null,
    ends_at: formData.get("ends_at") || null,
    sort_order: formData.get("sort_order") || 0,
    active: formData.get("active") === "on",
  });
}

function readScopeIds(formData: FormData) {
  const productIds = formData
    .getAll("product_ids")
    .map((v) => String(v))
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  const categoryIds = formData
    .getAll("category_ids")
    .map((v) => String(v))
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  return { productIds, categoryIds };
}

async function syncScope(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  ruleId: string,
  scope: "all" | "products" | "categories",
  productIds: string[],
  categoryIds: string[],
) {
  // Always wipe both link tables, then re-insert as needed. Cheaper than diff
  // for the small sets we expect.
  await Promise.all([
    supabase
      .from("promotion_rule_products")
      .delete()
      .eq("promotion_rule_id", ruleId),
    supabase
      .from("promotion_rule_categories")
      .delete()
      .eq("promotion_rule_id", ruleId),
  ]);

  if (scope === "products" && productIds.length > 0) {
    await supabase.from("promotion_rule_products").insert(
      productIds.map((product_id) => ({
        promotion_rule_id: ruleId,
        product_id,
      })),
    );
  }
  if (scope === "categories" && categoryIds.length > 0) {
    await supabase.from("promotion_rule_categories").insert(
      categoryIds.map((category_id) => ({
        promotion_rule_id: ruleId,
        category_id,
      })),
    );
  }
}

export async function createPromotionAction(
  _prev: PromotionActionState | undefined,
  formData: FormData,
): Promise<PromotionActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { productIds, categoryIds } = readScopeIds(formData);
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("promotion_rules")
      .insert({
        name: parsed.data.name,
        label: parsed.data.label,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        discount_value: parsed.data.discount_value,
        min_subtotal: parsed.data.min_subtotal ?? null,
        scope: parsed.data.scope,
        starts_at: parsed.data.starts_at || null,
        ends_at: parsed.data.ends_at || null,
        sort_order: parsed.data.sort_order ?? 0,
        active: parsed.data.active ?? true,
      })
      .select("id")
      .single();
    if (error || !data) return { message: error?.message ?? "Error" };

    await syncScope(supabase, data.id, parsed.data.scope, productIds, categoryIds);

    revalidatePath("/admin/promociones");
    revalidatePath("/", "layout");
    redirect("/admin/promociones");
  });
}

export async function updatePromotionAction(
  id: string,
  _prev: PromotionActionState | undefined,
  formData: FormData,
): Promise<PromotionActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { productIds, categoryIds } = readScopeIds(formData);
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("promotion_rules")
      .update({
        name: parsed.data.name,
        label: parsed.data.label,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        discount_value: parsed.data.discount_value,
        min_subtotal: parsed.data.min_subtotal ?? null,
        scope: parsed.data.scope,
        starts_at: parsed.data.starts_at || null,
        ends_at: parsed.data.ends_at || null,
        sort_order: parsed.data.sort_order ?? 0,
        active: parsed.data.active ?? true,
      })
      .eq("id", id);
    if (error) return { message: error.message };

    await syncScope(supabase, id, parsed.data.scope, productIds, categoryIds);

    revalidatePath("/admin/promociones");
    revalidatePath(`/admin/promociones/${id}`);
    revalidatePath("/", "layout");
    redirect("/admin/promociones");
  });
}

export async function deletePromotionAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("promotion_rules").delete().eq("id", id);
  revalidatePath("/admin/promociones");
  revalidatePath("/", "layout");
}

export async function togglePromotionActiveAction(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("promotion_rules").update({ active }).eq("id", id);
  revalidatePath("/admin/promociones");
  revalidatePath("/", "layout");
}
