"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultValue?: string[];
  folder?: string;
  label?: string;
  max?: number;
  /**
   * Optional helper text shown under the label (e.g. recommended
   * dimensions). Helps admins prep the right source file.
   */
  hint?: string;
};

export function MultiImageUpload({
  name,
  defaultValue = [],
  folder = "uploads",
  label = "Imágenes",
  max = 6,
  hint,
}: Props) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const next: string[] = [];
      for (const file of Array.from(files)) {
        if (urls.length + next.length >= max) break;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("public-assets")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage
          .from("public-assets")
          .getPublicUrl(path);
        next.push(data.publicUrl);
      }
      setUrls((prev) => [...prev, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  function remove(idx: number) {
    setUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {urls.map((u, idx) => (
          <div
            key={u}
            className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/90 opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Quitar"
            >
              <X className="h-4 w-4" />
            </button>
            {idx === 0 ? (
              <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                Principal
              </span>
            ) : null}
          </div>
        ))}

        {urls.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition hover:bg-muted/60 disabled:opacity-50",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span>{uploading ? "Subiendo..." : "Agregar"}</span>
          </button>
        ) : null}
      </div>

      {urls.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          Sube hasta {max} imágenes. La primera será la principal.
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
