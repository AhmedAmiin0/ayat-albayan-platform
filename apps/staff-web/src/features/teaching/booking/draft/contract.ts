import type { BookingRequest, LessonView } from '@ab/shared';

// R-SCH-10 / R-PAY-03 / R-MSG-06 wire contract lives in @ab/shared (booking-extras, makeup-views);
// re-exported here so the booking feature keeps one import path.
export { BOOKING_KINDS, INVOICE_MAX_BYTES, INVOICE_MIMES } from '@ab/shared';
export type { BookingKind, InvoiceInput, InvoiceView, MakeupCandidate, ThreadMediaItem } from '@ab/shared';

/** POST /booking: the shared request (kind, invoice and the missed lesson; a makeup has no package). */
export type BookingBody = BookingRequest;

export const isMakeup = (lesson: Pick<LessonView, 'makeup'>): boolean => lesson.makeup === true;
