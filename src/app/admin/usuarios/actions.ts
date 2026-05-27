"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";

const RoleSchema = z.enum(["customer", "admin"]);

export type UserActionState = {
  message?: string;
  ok?: boolean;
};

export async function updateUserRoleAction(
  userId: string,
  _prev: UserActionState | undefined,
  formData: FormData,
): Promise<UserActionState> {
  return runAction(async () => {
    const parsed = RoleSchema.safeParse(formData.get("role"));
    if (!parsed.success) {
      return { message: "Rol inválido" };
    }

    const { supabase, user: currentUser } = await requireAdmin();

    // Safety: don't let the only admin demote themselves and lock the
    // account out. We do the simpler check of "you can't change your own
    // role" — preventing accidental lockout.
    if (currentUser.id === userId) {
      return {
        message:
          "No puedes cambiar tu propio rol. Pide a otro admin que lo haga.",
      };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: parsed.data })
      .eq("id", userId);
    if (error) return { message: error.message };

    revalidatePath("/admin/usuarios");
    return { ok: true, message: "Rol actualizado." };
  });
}
