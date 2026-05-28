"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";

const FaqSchema = z.object({
  question: z.string().min(3, "La pregunta es muy corta"),
  answer: z.string().min(3, "La respuesta es muy corta"),
  sort_order: z.coerce.number().int().optional(),
  active: z.coerce.boolean().optional(),
});

export type FaqActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

function parseForm(formData: FormData) {
  return FaqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    sort_order: formData.get("sort_order") || 0,
    active: formData.get("active") === "on",
  });
}

function revalidate(id?: string) {
  revalidatePath("/admin/faq");
  if (id) revalidatePath(`/admin/faq/${id}`);
  revalidatePath("/preguntas-frecuentes");
}

export async function createFaqAction(
  _prev: FaqActionState | undefined,
  formData: FormData,
): Promise<FaqActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("faq_entries").insert({
      question: parsed.data.question,
      answer: parsed.data.answer,
      sort_order: parsed.data.sort_order ?? 0,
      active: parsed.data.active ?? true,
    });
    if (error) return { message: error.message };
    revalidate();
    redirect("/admin/faq");
  });
}

export async function updateFaqAction(
  id: string,
  _prev: FaqActionState | undefined,
  formData: FormData,
): Promise<FaqActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("faq_entries")
      .update({
        question: parsed.data.question,
        answer: parsed.data.answer,
        sort_order: parsed.data.sort_order ?? 0,
        active: parsed.data.active ?? true,
      })
      .eq("id", id);
    if (error) return { message: error.message };
    revalidate(id);
    redirect("/admin/faq");
  });
}

export async function deleteFaqAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("faq_entries").delete().eq("id", id);
  revalidate();
}

export async function toggleFaqActiveAction(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("faq_entries").update({ active }).eq("id", id);
  revalidate();
}
