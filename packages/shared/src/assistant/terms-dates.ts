// The start days of an assistant's terms (owner, 2026-10-06): nothing is retroactive. A new part starts
// today or later (today in the academy's time zone); an existing part's day can move later, never earlier.
// Twin of set_assistant_terms (migration 20261006000273), which decides; the form checks the same rule.

export type TermStartError = 'start_in_past' | 'start_earlier';

/** `next`, `current` and `today` are YYYY-MM-DD. `current` = the part's saved start day (none = creating it). */
export function termStartError(next: string, current: string | null | undefined, today: string): TermStartError | null {
  if (current) return next < current ? 'start_earlier' : null;
  return next < today ? 'start_in_past' : null;
}

/** The earliest day a start day may be set to now: the saved one, or today for a part that is not set yet. */
export const earliestTermStart = (current: string | null | undefined, today: string): string => current ?? today;
