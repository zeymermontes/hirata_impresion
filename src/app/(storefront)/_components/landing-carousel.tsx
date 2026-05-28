"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarouselSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
};

type Props = {
  slides: CarouselSlide[];
  /** Milliseconds between auto-rotations. 0 disables auto-play. */
  autoplayMs?: number;
  showArrows?: boolean;
  showDots?: boolean;
  /** Optional name shown only to admins / debugging; not rendered visually. */
  ariaLabel?: string;
};

/**
 * Full-width landing carousel of banner slides. Each slide is a backdrop
 * image with optional title/subtitle overlay; if the slide has a link_url
 * the whole slide is clickable.
 *
 * Auto-play pauses on hover so the user can read; arrows + dots give
 * manual control. Slide change is debounced through CSS opacity rather
 * than horizontal translation so the layout never shifts.
 */
export function LandingCarousel({
  slides,
  autoplayMs = 5000,
  showArrows = true,
  showDots = true,
  ariaLabel = "Carrusel de banners",
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    if (paused) return;
    if (autoplayMs <= 0) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, autoplayMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, paused, autoplayMs]);

  if (count === 0) return null;

  function go(next: number) {
    setIndex(((next % count) + count) % count);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className="relative isolate w-full overflow-hidden bg-secondary"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto aspect-[16/7] w-full max-w-7xl sm:aspect-[16/6] lg:aspect-[16/5]">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <SlideContainer key={slide.id} active={active} slide={slide} />
          );
        })}

        {showArrows && count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:right-4"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        {showDots && count > 1 ? (
          <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir al slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SlideContainer({
  active,
  slide,
}: {
  active: boolean;
  slide: CarouselSlide;
}) {
  const hasOverlayText = Boolean(slide.title || slide.subtitle);
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.image_url}
        alt={slide.title ?? ""}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {hasOverlayText ? (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/20 to-transparent">
          <div className="mx-auto w-full max-w-7xl px-4 pb-10 text-white sm:px-6 sm:pb-12 lg:px-8 lg:pb-16">
            {slide.title ? (
              <h2 className="text-2xl font-black tracking-tight drop-shadow-md sm:text-3xl lg:text-5xl">
                {slide.title}
              </h2>
            ) : null}
            {slide.subtitle ? (
              <p className="mt-2 max-w-xl text-sm text-white/90 drop-shadow-sm sm:text-base">
                {slide.subtitle}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );

  const wrapperClasses = cn(
    "absolute inset-0 transition-opacity duration-500",
    active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
  );

  if (slide.link_url) {
    return (
      <Link
        href={slide.link_url}
        aria-hidden={!active}
        tabIndex={active ? 0 : -1}
        className={wrapperClasses}
      >
        {content}
      </Link>
    );
  }
  return (
    <div aria-hidden={!active} className={wrapperClasses}>
      {content}
    </div>
  );
}
