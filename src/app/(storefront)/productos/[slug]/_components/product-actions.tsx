"use client";

import { useActionState, useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Upload, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addToCartAction,
  type AddToCartState,
} from "@/app/(storefront)/carrito/actions";
import { createClient } from "@/lib/supabase/client";
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
  requiresFile: boolean;
};

export function ProductActions({
  productId,
  basePrice,
  variants,
  requiresFile,
}: Props) {
  const [state, formAction] = useActionState<
    AddToCartState | undefined,
    FormData
  >(addToCartAction, undefined);

  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedVariant = variants.find((v) => v.id === variantId);
  const unitPrice =
    basePrice + (selectedVariant ? Number(selectedVariant.price_delta) : 0);
  const total = unitPrice * quantity;

  async function uploadFile(file: File) {
    setFileError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      // RLS only allows logged-in users to upload to their own folder.
      // For guests we tell them to sign in first.
      if (!user) {
        setFileError(
          "Necesitas iniciar sesión para subir archivos. Crea una cuenta o inicia sesión y vuelve a este producto.",
        );
        return;
      }
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("customer-uploads")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      // Customer uploads bucket is private; create a signed URL (1 year)
      const { data: signed } = await supabase.storage
        .from("customer-uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setFileUrl(signed?.signedUrl ?? "");
      setFileName(file.name);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Error al subir archivo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="uploaded_file_url" value={fileUrl} />

      {variants.length > 0 ? (
        <div className="space-y-2">
          <Label>Opción</Label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={cn(
                  "cursor-pointer rounded-md border px-3 py-2 text-sm transition",
                  variantId === v.id
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="variant_id"
                  value={v.id}
                  checked={variantId === v.id}
                  onChange={() => setVariantId(v.id)}
                  className="sr-only"
                />
                {v.name}
                {Number(v.price_delta) !== 0 ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {Number(v.price_delta) > 0 ? "+" : ""}
                    {formatMXN(Number(v.price_delta))}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="quantity">Cantidad</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={999}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="w-28"
        />
      </div>

      {requiresFile ? (
        <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-4">
          <Label>Tu archivo de diseño</Label>
          {fileUrl ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-background p-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="truncate font-medium">{fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFileUrl("");
                  setFileName("");
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Quitar archivo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background py-3 text-sm hover:bg-muted disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Subiendo..." : "Subir mi diseño (PDF, JPG, PNG, AI)"}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png,.ai,.psd,.tiff"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          {fileError ? (
            <p className="text-xs text-destructive">{fileError}</p>
          ) : null}
        </div>
      ) : null}

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

      <AddToCartSubmit disabled={requiresFile && !fileUrl} />
    </form>
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
