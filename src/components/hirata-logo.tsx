import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "image" | "inverse";
  /** Tailwind size classes for the cropped logo container (e.g. "h-12 w-48"). */
  size?: string;
};

/**
 * The Hirata logo file is 1667×1667 with significant whitespace padding around
 * the text. For the `image` variant we use `object-contain` (so the logo
 * preserves aspect and never crops the text or subtitle) plus a moderate
 * `scale` to enlarge the visible text by trimming the outer whitespace.
 */
export function HirataLogo({
  className,
  variant = "image",
  size = "h-12 w-44",
}: Props) {
  if (variant === "inverse") {
    return (
      <span
        className={cn(
          "inline-flex flex-col leading-none text-current",
          className,
        )}
      >
        <span className="flex items-baseline gap-1 font-serif text-2xl font-bold tracking-tight">
          Hirata
          <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.25em] opacity-70">
          Impresión Digital
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-block overflow-hidden align-middle",
        size,
        className,
      )}
    >
      <Image
        src="/hirata-logo.webp"
        alt="Hirata Impresión Digital"
        fill
        priority
        sizes="240px"
        className="object-contain scale-[1.9] origin-center select-none"
      />
    </span>
  );
}
