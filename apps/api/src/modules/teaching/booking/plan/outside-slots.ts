import {
  allDayRows,
  findConflicts,
  freeSlots,
  type ConflictInput,
  type OutsideSlot,
} from '@ab/shared';

// Pure: the teacher's whole day, not only her weekly hours.

export interface OutsideGridInput {
  /** The server's now: no start before it. */
  from: Date;
  to: Date;
  durationMin: number;
  stepMin: number;
  /** The grid steps from midnight in the teacher's zone, so 30 min keeps :00 and :30 there. */
  teacherTz: string;
  rows: Omit<ConflictInput, 'proposed'>;
}

/** Only the hours may be crossed: any other clash (lessons, time off) leaves the start out. */
const blocks = (kind: string): boolean => kind !== 'outside_availability';

/** Every start in [from, to] that clashes with nothing but the hours; inside_hours says which. */
export function outsideGrid(input: OutsideGridInput): OutsideSlot[] {
  const { from, to, durationMin, stepMin, rows } = input;
  const all = allDayRows(input.teacherTz);
  const grid = freeSlots({
    from,
    to,
    durationMin,
    availability: all,
    timeOff: [],
    busy: [],
    stepMin,
  });
  const proposed = grid.map((s) => ({ starts_at: s.start, ends_at: s.end }));
  const kinds = new Map<string, string[]>();
  for (const c of findConflicts({ proposed, ...rows }))
    kinds.set(c.startsAt, [...(kinds.get(c.startsAt) ?? []), c.kind]);
  return proposed.flatMap((p) => {
    const found = kinds.get(p.starts_at.toISOString()) ?? [];
    if (found.some(blocks)) return [];
    const at = { starts_at: p.starts_at.toISOString(), ends_at: p.ends_at.toISOString() };
    return [{ ...at, inside_hours: found.length === 0 }];
  });
}
