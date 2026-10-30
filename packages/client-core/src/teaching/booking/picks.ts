// A weekly package's picks (owner 2026-10-18: «اختر موعدًا لكل يوم»), shared by both booking wizards (docs/27 E5):
// the draft keeps the earliest pick as `startsAt` and the others in `extra`. Pure.

/** The picked slots of a booking draft: the earliest (the first lesson) and the others' UTC instants, sorted. */
export interface BookingPickFields {
  startsAt: string | null;
  extra: string[];
}

/** Every pick, earliest first. */
export function bookingPicks(d: BookingPickFields): string[] {
  return d.startsAt ? [d.startsAt, ...d.extra] : [];
}

/** The picks back into the draft: the earliest becomes `startsAt`. */
export function bookingPicksFrom(picks: readonly string[]): BookingPickFields {
  const [first, ...rest] = [...picks].sort((a, b) => Date.parse(a) - Date.parse(b));
  return { startsAt: first ?? null, extra: rest };
}
