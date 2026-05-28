"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runAction } from "@/lib/server-action";

const ContactSchema = z.object({
  email: z.string().email("Correo inválido"),
  phone: z.string().min(8, "Teléfono inválido"),
  whatsapp: z
    .string()
    .regex(/^\d{10,15}$/, "Solo dígitos, 10-15 caracteres (ej. 525512345678)"),
  whatsapp_label: z.string().min(8, "Versión legible del teléfono"),
});

export type ContactSettingsState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

export async function updateContactSettingsAction(
  _prev: ContactSettingsState | undefined,
  formData: FormData,
): Promise<ContactSettingsState> {
  return runAction(async () => {
    const parsed = ContactSchema.safeParse({
      email: formData.get("email"),
      phone: formData.get("phone"),
      whatsapp: formData.get("whatsapp"),
      whatsapp_label: formData.get("whatsapp_label"),
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }

    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("site_settings").upsert(
      { key: "contact", value: parsed.data },
      { onConflict: "key" },
    );
    if (error) return { message: error.message };

    revalidatePath("/contacto");
    revalidatePath("/", "layout");
    revalidatePath("/admin/configuracion");
    return { ok: true, message: "Información guardada." };
  });
}

// ============================================================
// Privacy policy
// ============================================================

const PrivacyPolicySchema = z.object({
  content: z.string().min(10, "El contenido es muy corto"),
});

export type PrivacyPolicyState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

export async function updatePrivacyPolicyAction(
  _prev: PrivacyPolicyState | undefined,
  formData: FormData,
): Promise<PrivacyPolicyState> {
  return runAction(async () => {
    const parsed = PrivacyPolicySchema.safeParse({
      content: formData.get("content"),
    });
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("site_settings").upsert(
      { key: "privacy_policy", value: parsed.data },
      { onConflict: "key" },
    );
    if (error) return { message: error.message };

    revalidatePath("/aviso-privacidad");
    revalidatePath("/admin/configuracion");
    return { ok: true, message: "Aviso de privacidad actualizado." };
  });
}
