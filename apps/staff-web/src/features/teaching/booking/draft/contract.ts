import type { LessonView } from '@ab/schedule';

// R-SCH-10 / R-PAY-03 / R-MSG-06 wire contract lives in @ab/shared (booking-extras, makeup-views);
// re-exported here so the booking feature keeps one import path.
export { BOOKING_KINDS, INVOICE_MAX_BYTES, INVOICE_MIMES } from '@ab/schedule';
export type {
  BookingKind,
  InvoiceInput,
  InvoiceView,
  MakeupCandidate,
} from '@ab/schedule';
export type { ThreadMediaItem } from '@ab/shared';

export const isMakeup = (lesson: Pick<LessonView, 'makeup'>): boolean => lesson.makeup === true;
