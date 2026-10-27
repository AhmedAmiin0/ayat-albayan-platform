// Booking evidence per student (pure), from «تقويم الحجوزات» (HUB, then BOOK): a «مشترك» weekly row
// still running on the import date (the series the schedule import creates, lessons ahead), and
// rows marked «تمت» (a lesson that took place). Students are found like the schedule import does.
import type { SourceBundle } from '../../../entities/contract.ts';
import { keyId } from '../../../keys.ts';
import { text } from '../../../sources/sheets/cells.ts';
import { bookingStatus } from '../../../sources/values.schedule.ts';
import type { SourceRow } from '../../../types.ts';
import { bookingStudents } from '../../schedule/booking-row.ts';
import { bookingRows, bookingSlot } from '../../schedule/booking-slot.ts';
import { importFrom } from '../../schedule/bookings.ts';
import type { StudentIndex } from '../match.ts';

interface BookingFacts {
  /** student keyIds with a «مشترك» weekly booking that has lessons on or after the import date. */
  series: Set<string>;
  /** student keyIds named by a booking marked «تمت». */
  done: Set<string>;
}

/** Which set a booking row adds its students to: a running «مشترك» series, «تمت», or none. */
function kindOf(r: SourceRow, o: { from: string; today: string }): keyof BookingFacts | null {
  const status = bookingStatus(text(r.fields['status']));
  if (status === 'done') return 'done';
  if (status !== 'subscribed') return null;
  const slot = bookingSlot(r.fields, o.from);
  if (slot.kind !== 'rule') return null;
  return slot.rec.until === null || slot.rec.until >= o.today ? 'series' : null;
}

export function bookingFacts(bundle: SourceBundle, ix: StudentIndex): BookingFacts {
  const out: BookingFacts = { series: new Set(), done: new Set() };
  const o = { from: importFrom(bundle), today: bundle.today };
  for (const r of bookingRows(bundle.sheets)) {
    const kind = kindOf(r, o);
    const students = kind ? bookingStudents(r, ix) : [];
    if (kind && Array.isArray(students)) for (const k of students) out[kind].add(keyId(k));
  }
  return out;
}
