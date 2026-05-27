"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
};

export function CategoryBannerCarousel({
  banners,
}: {
  banners: CategoryBanner[];
}) {
  const [idx, setIdx] = useState(0);
  const total = banners.length;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate every 6s if more than one banner. Pauses on hover via class
  // toggling (CSS group hover).
  useEffect(() => {
    if (total <= 1) return;
    intervalRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % total);
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [total]);

  if (total === 0) return null;

  const active = banners[idx];

  return (
    <div className="group relative overflow-hidden rounded-xl bg-secondary">
      <BannerSlide banner={active} />

      {total > 1 ? (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => setIdx((i) => (i - 1 + total) % total)}
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-background/80 text-foreground opacity-0 transition group-hover:opacity-100 hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => setIdx((i) => (i + 1) % total)}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-background/80 text-foreground opacity-0 transition group-hover:opacity-100 hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir al banner ${i + 1}`}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-white/60 hover:bg-white",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function BannerSlide({ banner }: { banner: CategoryBanner }) {
  const inner = (
    <div className="relative aspect-[16/5] w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.image_url}
        alt={banner.title}
        className="h-full w-full object-cover"
      />
      {banner.title || banner.subtitle ? (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/20 to-transparent p-6">
          <div className="text-white">
            <h2 className="text-xl font-bold sm:text-2xl">{banner.title}</h2>
            {banner.subtitle ? (
              <p className="text-sm text-white/90">{banner.subtitle}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (banner.link_url) {
    return (
      <Link href={banner.link_url} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
