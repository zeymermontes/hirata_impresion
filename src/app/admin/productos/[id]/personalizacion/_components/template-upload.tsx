"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  onUpload: (info: { url: string; width: number; height: number }) => void;
};

/**
 * Uploads a template image to `public-assets/templates/` and reads its natural
 * dimensions so the zone editor knows the native canvas size to use for zone
 * coordinates.
 */
export function TemplateUpload({ onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `templates/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("public-assets")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage
        .from("public-assets")
        .getPublicUrl(path);

      const dims = await loadImageDimensions(data.publicUrl);
      onUpload({ url: data.publicUrl, ...dims });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition hover:bg-muted/60 disabled:opacity-50",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            Subiendo plantilla...
          </>
        ) : (
          <>
            <Upload className="h-6 w-6" />
            <span>Sube la plantilla base</span>
            <span className="text-xs">
              PNG/JPG. Idealmente el diseño definitivo con marcadores donde irán
              los campos del cliente.
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function loadImageDimensions(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}
