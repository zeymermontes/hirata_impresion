import { createClient } from "@/lib/supabase/server";

// ============================================================
// Contact settings
// ============================================================

export type ContactSettings = {
  email: string;
  phone: string;
  /** WhatsApp number without "+" or spaces (used for wa.me URLs). */
  whatsapp: string;
  /** Formatted version of the WhatsApp number, shown to users. */
  whatsapp_label: string;
};

const CONTACT_FALLBACK: ContactSettings = {
  email: "hola@hirata.mx",
  phone: "+52 55 1234 5678",
  whatsapp: "525512345678",
  whatsapp_label: "+52 55 1234 5678",
};

function parseContact(value: unknown): ContactSettings {
  if (!value || typeof value !== "object") return CONTACT_FALLBACK;
  const v = value as Record<string, unknown>;
  return {
    email:
      typeof v.email === "string" && v.email.length > 0
        ? v.email
        : CONTACT_FALLBACK.email,
    phone:
      typeof v.phone === "string" && v.phone.length > 0
        ? v.phone
        : CONTACT_FALLBACK.phone,
    whatsapp:
      typeof v.whatsapp === "string" && v.whatsapp.length > 0
        ? v.whatsapp
        : CONTACT_FALLBACK.whatsapp,
    whatsapp_label:
      typeof v.whatsapp_label === "string" && v.whatsapp_label.length > 0
        ? v.whatsapp_label
        : CONTACT_FALLBACK.whatsapp_label,
  };
}

/**
 * Read contact info from site_settings. Falls back to baked-in defaults if the
 * row doesn't exist yet (e.g. migration not applied).
 */
export async function getContactSettings(): Promise<ContactSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "contact")
    .maybeSingle();
  return parseContact(data?.value);
}

// ============================================================
// Privacy policy
// ============================================================

export type PrivacyPolicy = {
  /** Admin-authored HTML body. */
  content: string;
  /** ISO timestamp of last update, useful to surface "last updated". */
  updated_at: string | null;
};

const PRIVACY_FALLBACK_HTML =
  "<p>Este aviso de privacidad se publicará pronto.</p>";

function parsePrivacyValue(value: unknown): string {
  if (!value || typeof value !== "object") return PRIVACY_FALLBACK_HTML;
  const v = value as Record<string, unknown>;
  return typeof v.content === "string" && v.content.trim().length > 0
    ? v.content
    : PRIVACY_FALLBACK_HTML;
}

/**
 * Read the privacy policy from site_settings. Falls back to a placeholder
 * paragraph if the row isn't there yet.
 */
export async function getPrivacyPolicy(): Promise<PrivacyPolicy> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value, updated_at")
    .eq("key", "privacy_policy")
    .maybeSingle();
  return {
    content: parsePrivacyValue(data?.value),
    updated_at: data?.updated_at ?? null,
  };
}
