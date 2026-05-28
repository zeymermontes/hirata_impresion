"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";

const CodeSchema = z
  .object({
    code: z
      .string()
      .min(2, "El código es muy corto")
      .max(40, "Máximo 40 caracteres")
      .regex(/^[A-Za-z0-9_-]+$/, "Solo letras, números, guiones y guión bajo")
      .transform((v) => v.toUpperCase()),
    label: z.string().min(2, "Agrega una descripción visible"),
    description: z.string().optional().nullable(),
    discount_type: z.enum(["percent", "amount", "free_shipping"]),
    value: z.coerce.number().min(0),
    min_subtotal: z
      .union([z.literal(""), z.coerce.number().nonnegative()])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    usage_limit: z
      .union([z.literal(""), z.coerce.number().int().positive()])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    active: z.coerce.boolean().optional(),
  })
  .refine(
    (v) =>
      v.discount_type !== "percent" || (v.value > 0 && v.value <= 100),
    {
      message: "El porcentaje debe estar entre 0 y 100",
      path: ["value"],
    },
  )
  .refine(
    (v) => v.discount_type !== "amount" || v.value > 0,
    { message: "Ingresa un monto mayor a 0", path: ["value"] },
  );

export type CodeActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

function parseForm(formData: FormData) {
  return CodeSchema.safeParse({
    code: formData.get("code"),
    label: formData.get("label"),
    description: formData.get("description") || null,
    discount_type: formData.get("discount_type"),
    value: formData.get("value") || 0,
    min_subtotal:
      formData.get("min_subtotal") === null ||
      formData.get("min_subtotal") === ""
        ? ""
        : formData.get("min_subtotal"),
    starts_at: formData.get("starts_at") || null,
    ends_at: formData.get("ends_at") || null,
    usage_limit:
      formData.get("usage_limit") === null ||
      formData.get("usage_limit") === ""
        ? ""
        : formData.get("usage_limit"),
    active: formData.get("active") === "on",
  });
}

export async function createCodeAction(
  _prev: CodeActionState | undefined,
  formData: FormData,
): Promise<CodeActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("promotions").insert({
      code: parsed.data.code,
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      discount_type: parsed.data.discount_type,
      value: parsed.data.value,
      min_subtotal: parsed.data.min_subtotal ?? null,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null,
      usage_limit: parsed.data.usage_limit ?? null,
      active: parsed.data.active ?? true,
    });
    if (error) {
      // Surface a friendlier message for the unique-constraint hit on `code`.
      if (error.code === "23505") {
        return {
          errors: { code: ["Ya existe un código con ese nombre"] },
        };
      }
      return { message: error.message };
    }

    revalidatePath("/admin/codigos");
    redirect("/admin/codigos");
  });
}

export async function updateCodeAction(
  id: string,
  _prev: CodeActionState | undefined,
  formData: FormData,
): Promise<CodeActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("promotions")
      .update({
        code: parsed.data.code,
        label: parsed.data.label,
        description: parsed.data.description ?? null,
        discount_type: parsed.data.discount_type,
        value: parsed.data.value,
        min_subtotal: parsed.data.min_subtotal ?? null,
        starts_at: parsed.data.starts_at || null,
        ends_at: parsed.data.ends_at || null,
        usage_limit: parsed.data.usage_limit ?? null,
        active: parsed.data.active ?? true,
      })
      .eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return {
          errors: { code: ["Ya existe un código con ese nombre"] },
        };
      }
      return { message: error.message };
    }

    revalidatePath("/admin/codigos");
    revalidatePath(`/admin/codigos/${id}`);
    redirect("/admin/codigos");
  });
}

export async function deleteCodeAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("promotions").delete().eq("id", id);
  revalidatePath("/admin/codigos");
}

export async function toggleCodeActiveAction(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("promotions").update({ active }).eq("id", id);
  revalidatePath("/admin/codigos");
}
