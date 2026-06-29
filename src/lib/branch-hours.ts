/**
 * Branch opening-hours model.
 *
 * Each branch stores a `hours_schedule` JSONB column keyed by weekday
 * (mon..sun). Each day is an array of time slots; an empty array means
 * the branch is closed that day. Multiple slots per day model the typical
 * Mexican lunch-hour break (e.g. 9-14, 16-19).
 */

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type TimeSlot = { open: string; close: string };

export type BranchSchedule = Record<Weekday, TimeSlot[]>;

export const WEEKDAY_LABEL_ES: Record<Weekday, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

// `Date.getDay()` returns 0=Sun..6=Sat. WEEKDAY_FROM_GETDAY[d.getDay()]
// gives back our short code so callers don't have to hand-translate.
const WEEKDAY_FROM_GETDAY: readonly Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isTimeSlot(raw: unknown): raw is TimeSlot {
  if (!raw || typeof raw !== "object") return false;
  const v = raw as Record<string, unknown>;
  return (
    typeof v.open === "string" &&
    HHMM.test(v.open) &&
    typeof v.close === "string" &&
    HHMM.test(v.close)
  );
}

/**
 * Parse whatever sat in the JSONB column into a normalized schedule.
 * Unknown / malformed entries become empty arrays so the UI never has
 * to guard against shape drift.
 */
export function parseBranchSchedule(raw: unknown): BranchSchedule {
  const out = emptySchedule();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const day of WEEKDAYS) {
    const slotsRaw = obj[day];
    if (!Array.isArray(slotsRaw)) continue;
    out[day] = slotsRaw.filter(isTimeSlot).map((s) => ({
      open: s.open,
      close: s.close,
    }));
  }
  return out;
}

export function emptySchedule(): BranchSchedule {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
}

/**
 * Defaults used when the admin opens a brand-new branch with no schedule
 * stored yet — typical Mexican papelería hours so they only need to
 * tweak rather than fill in seven empty rows.
 */
export function defaultSchedule(): BranchSchedule {
  return {
    mon: [{ open: "09:00", close: "17:00" }],
    tue: [{ open: "09:00", close: "17:00" }],
    wed: [{ open: "09:00", close: "17:00" }],
    thu: [{ open: "09:00", close: "17:00" }],
    fri: [{ open: "09:00", close: "17:00" }],
    sat: [{ open: "10:00", close: "14:00" }],
    sun: [],
  };
}

export function hasAnySlot(schedule: BranchSchedule): boolean {
  return WEEKDAYS.some((d) => schedule[d].length > 0);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * `09:00` → `9:00`. Drops the leading zero on the hour so the display
 * matches the casual Mexican rendering ("9:00") instead of the formal
 * 24-hour ("09:00"). Keeps the minutes padded.
 */
function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${parseInt(h, 10)}:${m}`;
}

export function formatSlot(slot: TimeSlot): string {
  return `${formatTime(slot.open)}–${formatTime(slot.close)}`;
}

/**
 * Render schedule as a list of { day label, value } lines for display.
 * Closed days return "Cerrado". Multiple slots are joined with ", ".
 */
export function scheduleAsLines(
  schedule: BranchSchedule,
): { day: string; value: string; closed: boolean }[] {
  return WEEKDAYS.map((d) => {
    const slots = schedule[d];
    if (slots.length === 0) {
      return { day: WEEKDAY_LABEL_ES[d], value: "Cerrado", closed: true };
    }
    return {
      day: WEEKDAY_LABEL_ES[d],
      value: slots.map(formatSlot).join(", "),
      closed: false,
    };
  });
}

/**
 * Returns true if any slot for today contains `now`. The comparison is
 * inclusive on the open boundary and exclusive on close so a slot ending
 * at 17:00 is "closed at 17:00", not "open until 17:01".
 */
export function isOpenNow(schedule: BranchSchedule, now: Date = new Date()): boolean {
  const day = WEEKDAY_FROM_GETDAY[now.getDay()];
  const slots = schedule[day];
  if (slots.length === 0) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return slots.some(
    (s) => minutes >= toMinutes(s.open) && minutes < toMinutes(s.close),
  );
}
