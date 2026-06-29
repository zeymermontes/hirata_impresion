"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  emptySchedule,
  parseBranchSchedule,
  type BranchSchedule,
} from "@/lib/branch-hours";
import type { Json } from "@/lib/supabase/database.types";

const BranchSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  phone: z.string().optional().nullable(),
  hours: z.string().optional().nullable(),
  active: z.coerce.boolean().optional(),
});

export type BranchActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
};

/**
 * The schedule editor serializes its state to JSON in a hidden input.
 * If parsing fails (e.g. tampered form, no input) we fall back to an
 * all-closed schedule rather than blowing up the form submission.
 */
function parseScheduleField(raw: FormDataEntryValue | null): BranchSchedule {
  if (typeof raw !== "string" || !raw.trim()) return emptySchedule();
  try {
    return parseBranchSchedule(JSON.parse(raw));
  } catch {
    return emptySchedule();
  }
}

function parseForm(formData: FormData) {
  return BranchSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    phone: formData.get("phone") || null,
    hours: formData.get("hours") || null,
    active: formData.get("active") === "on",
  });
}

export async function createBranchAction(
  _prev: BranchActionState | undefined,
  formData: FormData,
): Promise<BranchActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const schedule = parseScheduleField(formData.get("hours_schedule"));
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("branches").insert({
    ...parsed.data,
    hours_schedule: schedule as unknown as Json,
  });
  if (error) return { message: error.message };

  revalidatePath("/admin/sucursales");
  revalidatePath("/sucursales");
  revalidatePath("/contacto");
  redirect("/admin/sucursales");
}

export async function updateBranchAction(
  id: string,
  _prev: BranchActionState | undefined,
  formData: FormData,
): Promise<BranchActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const schedule = parseScheduleField(formData.get("hours_schedule"));
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("branches")
    .update({
      ...parsed.data,
      hours_schedule: schedule as unknown as Json,
    })
    .eq("id", id);
  if (error) return { message: error.message };

  revalidatePath("/admin/sucursales");
  revalidatePath("/sucursales");
  revalidatePath("/contacto");
  redirect("/admin/sucursales");
}

export async function deleteBranchAction(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("branches").delete().eq("id", id);
  revalidatePath("/admin/sucursales");
  revalidatePath("/sucursales");
  revalidatePath("/contacto");
}
