import { wallParts, type Conflict, type SlotView } from '@ab/shared';

// What the slot data (GET /booking/slots, the grid's own answer) already says about a time picked
// on the time input, before the series check (POST …/check) decides: free, busy (its conflicts, the
// grid's reasons), outside the teacher's availability, already past, or not on the grid's step
// (e.g. 17:10 between 17:00 and 17:30: only the series check can tell). Pure.

export type PickState =
  | { kind: 'free' }
  | { kind: 'busy'; conflicts: Conflict[] }
  | { kind: 'outside'; conflict: Conflict }
  | { kind: 'past' }
  | { kind: 'unchecked' };

export interface PickCheckInput {
  /** The picked instant (ISO). */
  at: string;
  slots: readonly SlotView[];
  /** The grid's step (SlotsResponse.step_min). */
  stepMin: number;
  /** The lesson length: the outside conflict's end. */
  durationMin: number;
  now: Date;
}

const MINUTE = 60_000;
const startOf = (s: SlotView): number => Date.parse(s.starts_at);

/** Is `at` between two neighbouring grid starts (inside the same availability window)? */
function insideGrid(at: number, input: PickCheckInput): boolean {
  const before = input.slots.filter((s) => startOf(s) < at).map(startOf);
  const after = input.slots.filter((s) => startOf(s) > at).map(startOf);
  const gap = Math.min(...after) - Math.max(...before);
  return before.length > 0 && after.length > 0 && gap <= input.stepMin * MINUTE;
}

function offGrid(at: number, input: PickCheckInput): PickState {
  const endsAt = new Date(at + input.durationMin * MINUTE).toISOString();
  const conflict: Conflict = { kind: 'outside_availability', startsAt: new Date(at).toISOString(), endsAt };
  return insideGrid(at, input) ? { kind: 'unchecked' } : { kind: 'outside', conflict };
}

export function pickState(input: PickCheckInput): PickState {
  const at = Date.parse(input.at);
  if (at < input.now.getTime()) return { kind: 'past' };
  const slot = input.slots.find((s) => startOf(s) === at);
  if (!slot) return offGrid(at, input);
  return slot.conflicts.length === 0 ? { kind: 'free' } : { kind: 'busy', conflicts: slot.conflicts };
}

export interface NearestInput {
  at: string;
  slots: readonly SlotView[];
  /** The student's zone: suggestions stay on the picked day there. */
  tz: string;
  /** How many (3 by default). */
  limit?: number;
}

/** The free grid starts nearest to `at` on its local day, earliest first (optional suggestions). */
export function nearestFree({ at, slots, tz, limit = 3 }: NearestInput): string[] {
  const day = wallParts(at, tz).date;
  const target = Date.parse(at);
  return slots
    .filter((s) => s.conflicts.length === 0 && startOf(s) !== target)
    .filter((s) => wallParts(s.starts_at, tz).date === day)
    .map((s) => s.starts_at)
    .sort((a, b) => Math.abs(Date.parse(a) - target) - Math.abs(Date.parse(b) - target))
    .slice(0, limit)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
}
