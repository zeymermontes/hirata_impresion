import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Branded placeholder shown wherever a product preview would render but a
 * gift-card product doesn't have its own image uploaded. Fills its parent
 * so call sites can drop it inside any aspect-square / aspect-video
 * container without extra wrapping. Yellow on near-black mirrors the
 * brand palette.
 */
export function GiftCardThumb({
  className,
  iconClassName,
  showLabel = false,
}: {
  className?: string;
  iconClassName?: string;
  /** Render the "Gift card" tag underneath the icon (use only on larger sizes). */
  showLabel?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1 bg-secondary text-secondary-foreground",
        className,
      )}
      aria-label="Gift card"
    >
      <div
        className={cn(
          "grid place-items-center rounded-md bg-primary text-primary-foreground",
          showLabel ? "h-10 w-10" : "h-7 w-7",
        )}
      >
        <Gift className={cn("h-4 w-4", iconClassName)} />
      </div>
      {showLabel ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Gift card
        </span>
      ) : null}
    </div>
  );
}
