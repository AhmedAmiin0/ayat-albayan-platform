import type { BookingKind } from './contract';
import type { BookingDraft } from './draft';

/**
 * What changing the booking type resets: the package size, the missed lesson, the invoice and the
 * picked slot (the grid and the repeat days depend on the type). A makeup is for one student.
 */
export function kindPatch(d: Pick<BookingDraft, 'kind' | 'students'>, kind: BookingKind): Partial<BookingDraft> {
  if (kind === d.kind) return {};
  return {
    kind,
    pkg: kind === 'trial' ? 'trial' : '8',
    missed: null,
    invoice: null,
    startsAt: null,
    extra: [],
    ...(kind === 'makeup' ? { students: d.students.slice(0, 1) } : {}),
  };
}
