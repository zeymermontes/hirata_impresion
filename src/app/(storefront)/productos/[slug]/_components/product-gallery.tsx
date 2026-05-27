"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return <div className="aspect-square w-full rounded-xl bg-muted" />;
  }

  const activeSrc = images[activeIdx] ?? images[0];

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Ver imagen en tamaño completo"
          className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeSrc}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm transition group-hover:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" />
            Ampliar
          </span>
        </button>

        {images.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`Ver imagen ${i + 1}`}
                className={cn(
                  "aspect-square overflow-hidden rounded-md border-2 bg-muted transition",
                  i === activeIdx
                    ? "border-primary"
                    : "border-transparent hover:border-border",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightboxOpen ? (
        <Lightbox
          images={images}
          startIdx={activeIdx}
          name={name}
          onClose={(finalIdx) => {
            setActiveIdx(finalIdx);
            setLightboxOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  images,
  startIdx,
  name,
  onClose,
}: {
  images: string[];
  startIdx: number;
  name: string;
  onClose: (finalIdx: number) => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const total = images.length;

  const goPrev = useCallback(
    () => setIdx((i) => (i - 1 + total) % total),
    [total],
  );
  const goNext = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(idx);
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [idx, onClose, goPrev, goNext]);

  // Lock body scroll while open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const src = images[idx];
  const hasMultiple = total > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — galería`}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={() => onClose(idx)}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
        <span className="text-sm font-medium">
          {idx + 1} <span className="text-white/60">/ {total}</span>
        </span>
        <button
          type="button"
          onClick={() => onClose(idx)}
          aria-label="Cerrar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultiple ? (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Imagen anterior"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={`${name} — ${idx + 1}`}
          className="max-h-[calc(100svh-11rem)] max-w-[calc(100vw-6rem)] select-none object-contain"
          draggable={false}
        />

        {hasMultiple ? (
          <button
            type="button"
            onClick={goNext}
            aria-label="Imagen siguiente"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      {hasMultiple ? (
        <div
          className="flex items-center justify-center gap-2 px-4 pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((thumb, i) => (
            <button
              key={thumb}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Ir a imagen ${i + 1}`}
              className={cn(
                "h-14 w-14 overflow-hidden rounded-md border-2 transition",
                i === idx
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
