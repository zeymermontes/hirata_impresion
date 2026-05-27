"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { runAction } from "@/lib/server-action";

const AddressSchema = z.object({
  label: z.string().min(1, "Pon una etiqueta para identificarla"),
  recipient: z.string().min(2, "Nombre del destinatario"),
  street: z.string().min(2, "Calle requerida"),
  ext_number: z.string().optional().nullable(),
  int_number: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().min(1, "Ciudad requerida"),
  state: z.string().min(1, "Estado requerido"),
  zip: z.string().regex(/^\d{5}$/, "CP de 5 dígitos"),
  phone: z.string().optional().nullable(),
  is_default: z.coerce.boolean().optional(),
});

export type AddressActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
};

function parseForm(formData: FormData) {
  return AddressSchema.safeParse({
    label: formData.get("label"),
    recipient: formData.get("recipient"),
    street: formData.get("street"),
    ext_number: formData.get("ext_number") || null,
    int_number: formData.get("int_number") || null,
    neighborhood: formData.get("neighborhood") || null,
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    phone: formData.get("phone") || null,
    is_default: formData.get("is_default") === "on",
  });
}

export async function createAddressAction(
  _prev: AddressActionState | undefined,
  formData: FormData,
): Promise<AddressActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase, user } = await requireUser();

    // If marking as default, unset existing defaults first.
    if (parsed.data.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { error } = await supabase.from("addresses").insert({
      ...parsed.data,
      user_id: user.id,
    });
    if (error) return { message: error.message };

    revalidatePath("/mi-cuenta/direcciones");
    revalidatePath("/checkout");
    return { ok: true };
  });
}

export async function updateAddressAction(
  id: string,
  _prev: AddressActionState | undefined,
  formData: FormData,
): Promise<AddressActionState> {
  return runAction(async () => {
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors };
    }
    const { supabase, user } = await requireUser();

    if (parsed.data.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", id);
    }

    const { error } = await supabase
      .from("addresses")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { message: error.message };

    revalidatePath("/mi-cuenta/direcciones");
    revalidatePath("/checkout");
    return { ok: true };
  });
}

export async function deleteAddressAction(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/mi-cuenta/direcciones");
  revalidatePath("/checkout");
}

export async function setDefaultAddressAction(id: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);
  await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/mi-cuenta/direcciones");
  revalidatePath("/checkout");
}
