/**
 * Shared types and helpers for product customization templates.
 *
 * - `TemplateConfig` describes the canvas image and zones for a product.
 * - Each `Zone` binds to a customization field's `name` and renders the field
 *   value over the template at the given position/style.
 * - Coordinates are stored in NATIVE template pixels; renderers compute a
 *   scale factor from native → display.
 */

export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "dropdown"
  | "file";

export type CustomField = {
  id: string;
  type: CustomFieldType;
  name: string;
  label: string;
  required: boolean;
  options: string[] | null;
  price_delta_rules: Record<string, number> | null;
};

export type Zone = {
  field: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font_family?: string;
  font_size?: number;
  font_weight?: string;
  color?: string;
  align?: "left" | "center" | "right";
};

export type TemplateConfig = {
  template_url: string;
  canvas_width: number;
  canvas_height: number;
  zones: Zone[];
};

export function isTemplateConfig(value: unknown): value is TemplateConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.template_url === "string" &&
    typeof v.canvas_width === "number" &&
    typeof v.canvas_height === "number" &&
    Array.isArray(v.zones)
  );
}

export function parseCustomField(raw: {
  id: string;
  type: string;
  name: string;
  label: string;
  required: boolean;
  options: unknown;
  price_delta_rules: unknown;
}): CustomField {
  return {
    id: raw.id,
    type: raw.type as CustomFieldType,
    name: raw.name,
    label: raw.label,
    required: raw.required,
    options: Array.isArray(raw.options) ? (raw.options as string[]) : null,
    price_delta_rules:
      raw.price_delta_rules && typeof raw.price_delta_rules === "object"
        ? (raw.price_delta_rules as Record<string, number>)
        : null,
  };
}

/**
 * Compute the price delta for a given customization values dict, summing all
 * `price_delta_rules` matches across fields.
 */
export function computeCustomizationPriceDelta(
  fields: CustomField[],
  values: Record<string, unknown>,
): number {
  let delta = 0;
  for (const f of fields) {
    if (!f.price_delta_rules) continue;
    const v = values[f.name];
    if (typeof v === "string" && f.price_delta_rules[v] !== undefined) {
      delta += Number(f.price_delta_rules[v]);
    }
  }
  return delta;
}
