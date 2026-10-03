import type { BookingRequest, LessonView } from '@ab/shared';

// Stand-ins for the booking-type / invoice contract (spec R-SCH-10, R-PAY-03, R-MSG-06) until
// @ab/shared exports it (booking-extras.ts, LessonView.makeup, ThreadMediaItem). Local on purpose:
// at integration, replace each with the shared one and delete this file's copy.

export type BookingKind = 'trial' | 'package' | 'makeup';

/** What POST /booking takes as «الفاتورة»: a file uploaded to the signed path, or a chat message. */
export type InvoiceInput =
  | { source: 'upload'; path: string }
  | { source: 'whatsapp'; messageId: string };

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

/** GET /threads/:phone/media item: an inbound image or PDF, metadata only. */
export interface ThreadMediaItem {
  message_id: string;
  created_at: string;
  mime: string;
  caption: string | null;
  /** Past WhatsApp's ~30 days: the file can no longer be fetched. */
  expired: boolean;
}

/** GET /threads/:phone/media/:messageId: the cached file, signed. */
export interface MediaUrl {
  url: string;
  mime: string;
  expires_at: string;
}

/** LessonView.makeup: the lesson is a replacement for a missed one. Absent on an old API. */
export type MakeupLessonView = LessonView & { makeup?: boolean };

const DAY = 86_400_000;
export const MAKEUP_WINDOW_DAYS = 60;

/**
 * The students a lesson can be made up for (spec §1): a no_show or excused lesson within 60 days,
 * not a trial and not itself a makeup, for each student still charged for it. Cancelled and
 * rescheduled lessons are not offered: their unit was never used («غيّر الميعاد» covers them).
 */
export function makeupStudents(lesson: MakeupLessonView, now: Date): LessonView['students'] {
  const recent = Date.parse(lesson.starts_at) >= now.getTime() - MAKEUP_WINDOW_DAYS * DAY;
  const missed = lesson.status === 'no_show' || lesson.status === 'excused';
  if (!recent || !missed || lesson.trial === true || lesson.makeup === true) return [];
  return lesson.students.filter((s) => s.chargeable);
}
