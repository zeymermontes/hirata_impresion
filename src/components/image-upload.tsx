"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultValue?: string;
  /**
   * Subfolder inside the `public-assets` bucket (e.g. "banners", "products").
   */
  folder?: string;
  label?: string;
  aspect?: "square" | "video" | "wide";
  /**
   * Optional small helper text shown under the label (e.g. recommended
   * dimensions like "1200×900 px (4:3)"). Helps admins pick the right
   * source file before uploading.
   */
  hint?: string;
};

export function ImageUpload({
  name,
  defaultValue,
  folder = "uploads",
  label = "Imagen",
  aspect = "video",
  hint,
}: Props) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("public-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "wide"
        ? "aspect-[16/6]"
        : "aspect-video";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-md border border-border bg-muted",
            aspectClass,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setUrl("")}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/90 shadow hover:bg-background"
            aria-label="Quitar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition hover:bg-muted/60 disabled:opacity-50",
            aspectClass,
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span>Haz click para subir una imagen</span>
              <span className="text-xs">PNG, JPG, WEBP — máx 5 MB</span>
            </>
          )}
        </button>
      )}

      {url ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Reemplazar imagen
        </Button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
