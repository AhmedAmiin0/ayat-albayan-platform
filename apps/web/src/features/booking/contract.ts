import type { BookingRequest, LessonView } from '@ab/shared';

// R-SCH-10 / R-PAY-03 / R-MSG-06 wire contract lives in @ab/shared (booking-extras, makeup-views);
// re-exported here so the booking feature keeps one import path.
export { BOOKING_KINDS, INVOICE_MAX_BYTES, INVOICE_MIMES } from '@ab/shared';
export type { BookingKind, InvoiceInput, InvoiceView, MakeupCandidate, ThreadMediaItem } from '@ab/shared';

/** POST /booking: the shared request (kind, invoice and the missed lesson; a makeup has no package). */
export type BookingBody = BookingRequest;

export const isMakeup = (lesson: LessonView): boolean => lesson.makeup === true;

/**
 * A lesson «حجز تعويضي» may be offered on: the student missed it (no-show, or they excused),
 * it counted, it is not a trial and not itself a makeup. The API decides again (makeup_not_eligible).
 */
export function missedStudents(lesson: LessonView): LessonView['students'] {
  const missed = lesson.status === 'no_show' || lesson.status === 'excused';
  return missed && !lesson.trial && !isMakeup(lesson) ? lesson.students.filter((s) => s.chargeable) : [];
}
