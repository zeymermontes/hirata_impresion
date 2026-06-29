"use client";

import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WEEKDAYS,
  WEEKDAY_LABEL_ES,
  type BranchSchedule,
  type TimeSlot,
  type Weekday,
} from "@/lib/branch-hours";

type Props = {
  /** Serialized JSON of the schedule is written into this hidden input. */
  name: string;
  defaultValue: BranchSchedule;
};

/**
 * One row per weekday. Each row is either "Cerrado" with a "+ Abrir"
 * action, or a stack of time slots with a "+ Agregar horario" action
 * (for the lunch-break pattern). The whole schedule is serialized to a
 * single hidden input so the surrounding plain form can submit it.
 *
 * A "Copiar a Lun-Vie" shortcut on the Lunes row lets the admin set up
 * one weekday and apply it to the rest in one click — most branches
 * have identical weekday hours and we want to avoid making them type
 * the same numbers five times.
 */
export function ScheduleEditor({ name, defaultValue }: Props) {
  const [schedule, setSchedule] = useState<BranchSchedule>(defaultValue);

  function update(day: Weekday, slots: TimeSlot[]) {
    setSchedule((prev) => ({ ...prev, [day]: slots }));
  }

  function copyMondayToWeekdays() {
    const monSlots = schedule.mon;
    setSchedule((prev) => ({
      ...prev,
      tue: cloneSlots(monSlots),
      wed: cloneSlots(monSlots),
      thu: cloneSlots(monSlots),
      fri: cloneSlots(monSlots),
    }));
  }

  return (
    <div className="rounded-md border border-border">
      <input type="hidden" name={name} value={JSON.stringify(schedule)} />
      <ul className="divide-y divide-border">
        {WEEKDAYS.map((day) => (
          <DayRow
            key={day}
            day={day}
            slots={schedule[day]}
            onChange={(slots) => update(day, slots)}
            onCopyMonday={
              day === "mon" ? copyMondayToWeekdays : undefined
            }
          />
        ))}
      </ul>
    </div>
  );
}

function DayRow({
  day,
  slots,
  onChange,
  onCopyMonday,
}: {
  day: Weekday;
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  onCopyMonday?: () => void;
}) {
  const closed = slots.length === 0;

  function addSlot() {
    // Pick a sensible starting slot. If empty: 9-17. If there's already
    // a morning slot, default the new one to 16:00–19:00 (post-lunch).
    const next: TimeSlot =
      slots.length === 0
        ? { open: "09:00", close: "17:00" }
        : { open: "16:00", close: "19:00" };
    onChange([...slots, next]);
  }

  function updateSlot(i: number, patch: Partial<TimeSlot>) {
    onChange(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeSlot(i: number) {
    onChange(slots.filter((_, idx) => idx !== i));
  }

  return (
    <li className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start">
      <div className="flex w-24 shrink-0 items-center justify-between sm:flex-col sm:items-start sm:gap-1 sm:pt-2">
        <span className="text-sm font-medium">{WEEKDAY_LABEL_ES[day]}</span>
        {onCopyMonday && !closed && slots.length > 0 ? (
          <button
            type="button"
            onClick={onCopyMonday}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            aria-label="Copiar a Mar-Vie"
          >
            <Copy className="h-3 w-3" />
            <span className="hidden sm:inline">Copiar a Mar-Vie</span>
            <span className="sm:hidden">Copiar L-V</span>
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-2">
        {closed ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Cerrado</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addSlot}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Abrir
            </Button>
          </div>
        ) : (
          <>
            {slots.map((slot, i) => (
              <SlotRow
                key={i}
                slot={slot}
                onChange={(patch) => updateSlot(i, patch)}
                onRemove={() => removeSlot(i)}
              />
            ))}
            <button
              type="button"
              onClick={addSlot}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Plus className="h-3 w-3" />
              Agregar horario (ej. tarde)
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function SlotRow({
  slot,
  onChange,
  onRemove,
}: {
  slot: TimeSlot;
  onChange: (patch: Partial<TimeSlot>) => void;
  onRemove: () => void;
}) {
  const invalid = slot.open >= slot.close;

  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={slot.open}
        onChange={(e) => onChange({ open: e.target.value })}
        className={cn(
          "h-9 rounded-md border border-input bg-background px-2 text-sm",
          invalid && "border-destructive",
        )}
        aria-label="Abre"
      />
      <span className="text-muted-foreground">–</span>
      <input
        type="time"
        value={slot.close}
        onChange={(e) => onChange({ close: e.target.value })}
        className={cn(
          "h-9 rounded-md border border-input bg-background px-2 text-sm",
          invalid && "border-destructive",
        )}
        aria-label="Cierra"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar horario"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {invalid ? (
        <span className="text-xs text-destructive">Cierre debe ser después de abrir</span>
      ) : null}
    </div>
  );
}

function cloneSlots(slots: TimeSlot[]): TimeSlot[] {
  return slots.map((s) => ({ open: s.open, close: s.close }));
}
