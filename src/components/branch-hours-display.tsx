import { Clock } from "lucide-react";
import {
  hasAnySlot,
  isOpenNow,
  parseBranchSchedule,
  scheduleAsLines,
} from "@/lib/branch-hours";
import { cn } from "@/lib/utils";

/**
 * Render a branch's opening hours consistently across the storefront.
 *
 * Resolution order:
 *   1. Structured `hours_schedule` JSONB (preferred, set via admin form).
 *   2. Legacy free-form `hours` text — kept for branches that haven't
 *      been re-saved through the new editor yet.
 *
 * `compact` collapses the per-day breakdown into a single line for the
 * checkout picker, where space matters and the customer just needs a
 * quick "is this open today?" answer.
 */
export function BranchHoursDisplay({
  scheduleRaw,
  legacyHours,
  compact = false,
  showOpenBadge = true,
  className,
}: {
  scheduleRaw: unknown;
  legacyHours: string | null | undefined;
  compact?: boolean;
  showOpenBadge?: boolean;
  className?: string;
}) {
  const schedule = parseBranchSchedule(scheduleRaw);
  const structured = hasAnySlot(schedule);

  // Legacy fallback: just render the free-form text, no badge.
  if (!structured) {
    if (!legacyHours) return null;
    return (
      <div className={cn("flex items-start gap-2 text-sm text-muted-foreground", className)}>
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{legacyHours}</span>
      </div>
    );
  }

  const open = isOpenNow(schedule);

  if (compact) {
    // Compact form: only show today's hours + open/closed badge. The
    // full week is one click away (the user can open the sucursales
    // page if they need it).
    const today = scheduleAsLines(schedule)[(new Date().getDay() + 6) % 7];
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">
          Hoy: <span className="text-foreground">{today.value}</span>
        </span>
        {showOpenBadge ? <OpenBadge open={open} /> : null}
      </div>
    );
  }

  const lines = scheduleAsLines(schedule);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">Horario</span>
        {showOpenBadge ? <OpenBadge open={open} /> : null}
      </div>
      <dl className="ml-6 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {lines.map((l) => (
          <div key={l.day} className="contents">
            <dt className="text-muted-foreground">{l.day}</dt>
            <dd className={cn(l.closed ? "text-muted-foreground italic" : "text-foreground")}>
              {l.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OpenBadge({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        open
          ? "border-emerald-200 bg-emerald-100 text-emerald-900"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          open ? "bg-emerald-600" : "bg-muted-foreground/60",
        )}
      />
      {open ? "Abierto ahora" : "Cerrado ahora"}
    </span>
  );
}
