"use client";

import { useActionState, useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Upload, Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CustomizerPreview } from "@/app/(storefront)/productos/[slug]/_components/customizer-preview";
import {
  addToCartAction,
  type AddToCartState,
} from "@/app/(storefront)/carrito/actions";
import { createClient } from "@/lib/supabase/client";
import {
  computeCustomizationPriceDelta,
  type CustomField,
  type TemplateConfig,
} from "@/lib/customization";
import { formatMXN, cn } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  price_delta: number;
};

type Props = {
  productId: string;
  basePrice: number;
  variants: Variant[];
  fields: CustomField[];
  template: TemplateConfig | null;
};

export function CustomizerForm({
  productId,
  basePrice,
  variants,
  fields,
  template,
}: Props) {
  const [state, formAction] = useActionState<
    AddToCartState | undefined,
    FormData
  >(addToCartAction, undefined);

  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, ""])),
  );
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.id === variantId);
  const variantDelta = selectedVariant ? Number(selectedVariant.price_delta) : 0;
  const customizationDelta = computeCustomizationPriceDelta(fields, values);
  const unitPrice = basePrice + variantDelta + customizationDelta;
  const total = unitPrice * quantity;

  // For server action: serialize all values + upload URLs into one JSON object.
  const customizationPayload = {
    ...values,
    ...Object.fromEntries(
      Object.entries(uploads).map(([k, v]) => [`${k}__url`, v]),
    ),
  };

  // Required validation: all required fields must have a value (or upload).
  const missingRequired = fields.filter((f) => {
    if (!f.required) return false;
    if (f.type === "file") return !uploads[f.name];
    return !values[f.name] || values[f.name].trim() === "";
  });

  async function handleFileUpload(fieldName: string, file: File) {
    setUploadError(null);
    setUploadingField(fieldName);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUploadError(
          "Necesitas iniciar sesión para subir archivos a tu personalización.",
        );
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("customer-uploads")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("customer-uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) {
        setUploads((prev) => ({ ...prev, [fieldName]: signed.signedUrl }));
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Error al subir archivo");
    } finally {
      setUploadingField(null);
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="product_id" value={productId} />
        <input
          type="hidden"
          name="customization"
          value={JSON.stringify(customizationPayload)}
        />
        <input type="hidden" name="variant_id" value={variantId} />

        {variants.length > 0 ? (
          <div className="space-y-2">
            <Label>Opción</Label>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition",
                    variantId === v.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {v.name}
                  {Number(v.price_delta) !== 0 ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {Number(v.price_delta) > 0 ? "+" : ""}
                      {formatMXN(Number(v.price_delta))}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <fieldset className="space-y-4 rounded-md border border-border bg-card p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Personaliza tu diseño
          </legend>

          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.name] ?? ""}
              uploadUrl={uploads[field.name]}
              uploading={uploadingField === field.name}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
              onUpload={(file) => handleFileUpload(field.name, file)}
              onClearUpload={() =>
                setUploads((prev) => {
                  const next = { ...prev };
                  delete next[field.name];
                  return next;
                })
              }
            />
          ))}

          {uploadError ? (
            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {uploadError}
            </p>
          ) : null}
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-28"
          />
        </div>

        <div className="flex items-baseline justify-between rounded-md bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold">{formatMXN(total)}</span>
        </div>

        {state?.message ? (
          <p
            className={cn(
              "rounded-md p-3 text-sm",
              state.ok
                ? "bg-emerald-100 text-emerald-900"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {state.message}
          </p>
        ) : null}

        {missingRequired.length > 0 ? (
          <p className="rounded-md bg-amber-100 p-2 text-xs text-amber-900">
            Faltan campos requeridos: {missingRequired.map((f) => f.label).join(", ")}
          </p>
        ) : null}

        <AddToCartSubmit disabled={missingRequired.length > 0} />
      </form>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview en vivo
        </p>
        {template ? (
          <CustomizerPreview
            template={template}
            fields={fields}
            values={values}
            uploads={uploads}
          />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Este producto todavía no tiene plantilla visual configurada. Llena
            los campos y tu pedido se procesará con esos datos.
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  uploadUrl,
  uploading,
  onChange,
  onUpload,
  onClearUpload,
}: {
  field: CustomField;
  value: string;
  uploadUrl: string | undefined;
  uploading: boolean;
  onChange: (v: string) => void;
  onUpload: (file: File) => void;
  onClearUpload: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const id = `cf-${field.name}`;

  if (field.type === "file") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {field.label}
          {field.required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        {uploadUrl ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="truncate">Archivo subido</span>
            </div>
            <button
              type="button"
              onClick={onClearUpload}
              aria-label="Quitar archivo"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background py-3 text-sm hover:bg-muted disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Subiendo..." : "Subir archivo"}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          id={id}
          hidden
          accept="image/*,.pdf,.ai,.psd"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  if (field.type === "dropdown") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {field.label}
          {field.required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        <Select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— elegir —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
              {field.price_delta_rules?.[opt] !== undefined &&
              field.price_delta_rules[opt] !== 0
                ? ` (${field.price_delta_rules[opt] > 0 ? "+" : ""}${formatMXN(field.price_delta_rules[opt])})`
                : ""}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {field.label}
          {field.required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        <Textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function AddToCartSubmit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      disabled={pending || disabled}
    >
      {pending ? "Agregando..." : "Agregar al carrito"}
    </Button>
  );
}
