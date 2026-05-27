"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { runAction } from "@/lib/server-action";

const ProfileSchema = z.object({
  full_name: z.string().min(2, "Ingresa tu nombre"),
  phone: z.string().optional().nullable(),
});

export type ProfileActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

export async function updateProfileAction(
  _prev: ProfileActionState | undefined,
  formData: FormData,
): Promise<ProfileActionState> {
  return runAction(async () => {
    const parsed = ProfileSchema.safeParse({
      full_name: formData.get("full_name"),
      phone: formData.get("phone") || null,
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", user.id);
    if (error) return { message: error.message };

    revalidatePath("/mi-cuenta/perfil");
    revalidatePath("/", "layout");
    return { ok: true, message: "Perfil actualizado." };
  });
}
