import { makeupEligible, type BookingKind, type BookingRequest, type InvoiceInput, type LessonView } from '@ab/shared';

// The booking-type / invoice contract (R-SCH-10, R-PAY-03, R-MSG-06) lives in @ab/shared; the
// types below are mobile-only (wizard drafts and the request shape it sends).
export type { BookingKind, InvoiceInput, ThreadMediaItem } from '@ab/shared';

/** The invoice the wizard holds: its input, plus what the preview needs. */
export type InvoiceDraft = InvoiceInput & {
  mime: string;
  /** A local photo, or the chat file's signed thumbnail; null for a PDF or an unloaded thumbnail. */
  uri: string | null;
};

/** The two fields a booking carries beyond today's BookingRequest. */
export interface BookingExtras {
  kind: BookingKind;
  invoice?: InvoiceInput;
}

/** A makeup is one lesson of one existing student, with no package and no lead. */
export interface MakeupRequest extends BookingExtras {
  kind: 'makeup';
  studentIds: [string];
  makeupOfLessonId: string;
  teacherId: string;
  byday: number[];
  startTimeLocal: string;
  tz: string;
  durationMin: number;
  startsOn: string;
  startsAt: string;
  clientRequestId: string;
}

export type BookingBody = (BookingRequest & BookingExtras) | MakeupRequest;

/** GET /threads/:phone/media/:messageId: the cached file, signed. */
export interface MediaUrl {
  url: string;
  mime: string;
  expires_at: string;
}

/** LessonView.makeup: the lesson is a replacement for a missed one. */
export type MakeupLessonView = LessonView;

/**
 * The students a lesson can be made up for: the shared `makeupEligible` rules (no_show or excused,
 * within 60 days, still charged, not a trial, not itself a makeup) for each student.
 */
export function makeupStudents(lesson: MakeupLessonView, now: Date): LessonView['students'] {
  const facts = { status: lesson.status, trial: lesson.trial === true, makeup: lesson.makeup === true, startsAt: lesson.starts_at };
  return lesson.students.filter((s) => makeupEligible({ ...facts, chargeable: s.chargeable }, now) === 'ok');
}
