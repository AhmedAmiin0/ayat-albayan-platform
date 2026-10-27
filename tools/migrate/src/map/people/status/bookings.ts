// Booking evidence per student (pure), from «تقويم الحجوزات» (HUB, then BOOK): the «مشترك» weekly
// rules the schedule import itself builds (bookingRules: teacher known, the newer row winning per
// rule key) that still run on the import date, and rows marked «تمت» (a lesson that took place).
import type { SourceBundle } from '../../../entities/contract.ts';
import { keyId } from '../../../keys.ts';
import type { Desired } from '../../../plan/resolve.ts';
import { text } from '../../../sources/sheets/cells.ts';
import { bookingStatus } from '../../../sources/values.schedule.ts';
import type { NaturalKey } from '../../../types.ts';
import { bookingStudents } from '../../schedule/booking-row.ts';
import { bookingRows } from '../../schedule/booking-slot.ts';
import { bookingRules, importFrom } from '../../schedule/bookings.ts';
import type { StudentIndex } from '../match.ts';

interface BookingFacts {
  /** student keyIds of a «مشترك» weekly rule with lessons on or after the import date. */
  series: Set<string>;
  /** student keyIds named by a booking marked «تمت». */
  done: Set<string>;
}

/** Last rule per key (prefer 'last', like resolve): a newer BOOK row beats the HUB copy. */
function runningSeries(bundle: SourceBundle, students: readonly Desired[]): Set<string> {
  const from = importFrom(bundle);
  const subscribed = new Set(
    bookingRows(bundle.sheets)
      .filter((r) => bookingStatus(text(r.fields['status'])) === 'subscribed')
      .map((r) => r.ref),
  );
  const earlier = new Map(bundle.earlier).set('students', students);
  const last = new Map<string, { running: boolean; students: NaturalKey[] }>();
  for (const r of bookingRules({ ...bundle, earlier })) {
    if (!('key' in r)) continue;
    const until = r.record.columns['ends_on'];
    const running = subscribed.has(r.ref) && (typeof until !== 'string' || until >= from);
    last.set(keyId(r.key), { running, students: r.students });
  }
  const out = new Set<string>();
  for (const s of last.values()) if (s.running) for (const k of s.students) out.add(keyId(k));
  return out;
}

export function bookingFacts(
  bundle: SourceBundle,
  o: { ix: StudentIndex; students: readonly Desired[] },
): BookingFacts {
  const done = new Set<string>();
  for (const r of bookingRows(bundle.sheets)) {
    if (bookingStatus(text(r.fields['status'])) !== 'done') continue;
    const found = bookingStudents(r, o.ix);
    if (Array.isArray(found)) for (const k of found) done.add(keyId(k));
  }
  return { series: runningSeries(bundle, o.students), done };
}
