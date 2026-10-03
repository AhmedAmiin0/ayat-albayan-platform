import { RECEIPT_MAX_BYTES, RECEIPT_MIMES, type BookingRequest, type LessonStatus, type LessonView, type PackageSize } from '@ab/shared';

// R-SCH-10 / R-PAY-03 / R-MSG-06 wire contract (spec sections 3-4). ponytail: stand-ins until the
// shared builder's branch (packages/shared booking-extras + views) merges; then swap these for the
// @ab/shared exports and delete this file.

export const BOOKING_KINDS = ['trial', 'package', 'makeup'] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export const INVOICE_MIMES = RECEIPT_MIMES;
export const INVOICE_MAX_BYTES = RECEIPT_MAX_BYTES;

/** `upload`: a path in the invoices bucket; `whatsapp`: an inbound chat message the API copies. */
export type InvoiceInput = { source: 'upload'; path: string } | { source: 'whatsapp'; messageId: string };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** POST /booking: the old request plus kind, invoice and the missed lesson; a makeup has no package. */
export type BookingBody = DistributiveOmit<BookingRequest, 'package'> & {
  package?: PackageSize;
  kind: BookingKind;
  invoice?: InvoiceInput;
  makeupOfLessonId?: string;
};

/** GET /booking/makeup-candidates?studentId — a missed lesson that may be made up. */
export interface MakeupCandidate {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  duration_min: number;
  teacher: { id: string; display_name_ar: string };
}

/** GET /invoices?ruleId|studentId (admin only). */
export interface InvoiceView {
  id: string;
  rule_id: string | null;
  kind: BookingKind;
  mime: string;
  size_bytes: number;
  source: 'upload' | 'whatsapp';
  created_at: string;
  students: { id: string; name: string; code: string | null }[];
}

/** GET /threads/:phone/media — an inbound image or PDF of the family (admin only). */
export interface ThreadMediaItem {
  message_id: string;
  created_at: string;
  mime: string;
  caption: string | null;
  /** Older than WhatsApp keeps it (29 days): cannot be fetched any more. */
  expired: boolean;
}

/** LessonView.makeup arrives with the shared views change; absent on an old cache. */
export const isMakeup = (lesson: LessonView): boolean => (lesson as LessonView & { makeup?: boolean }).makeup === true;

/**
 * A lesson «حجز تعويضي» may be offered on: the student missed it (no-show, or they excused),
 * it counted, it is not a trial and not itself a makeup. The API decides again (makeup_not_eligible).
 */
export function missedStudents(lesson: LessonView): LessonView['students'] {
  const missed = lesson.status === 'no_show' || lesson.status === 'excused';
  return missed && !lesson.trial && !isMakeup(lesson) ? lesson.students.filter((s) => s.chargeable) : [];
}
