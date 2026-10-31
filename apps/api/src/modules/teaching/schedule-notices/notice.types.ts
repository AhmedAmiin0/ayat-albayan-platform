import type { StaffOnRecord } from '@/modules/messaging/reminders';

// What a schedule-change notice knows once read (ScheduleNoticesRepo), before it is planned
// (notice.plan.ts). Owner 2026-10-30: the lesson's teacher and the student's family both hear it.

/** The four catalogue rows; each is also its template key and its bell / push kind. */
export const NOTICE_KEYS = [
  'lesson_rescheduled',
  'lesson_cancelled',
  'course_paused',
  'course_resumed',
] as const;
export type NoticeKey = (typeof NOTICE_KEYS)[number];

export interface NoticeTeacher extends StaffOnRecord {
  id: string;
  profile_id: string | null;
  phone_e164: string | null;
  tz: string;
  display_name_ar: string;
}

export interface NoticeGuardian {
  id: string;
  name: string;
  phone_e164: string;
  tz: string;
  profile_id: string | null;
}

export interface NoticeStudent {
  id: string;
  name: string;
  tz: string;
  profile_id: string | null;
  guardian: NoticeGuardian | null;
}

/** One change, ready to plan. */
export interface Notice {
  key: NoticeKey;
  /** What the dedup keys name: the lesson (and, for a move, its new start) or the pause. */
  subject: string;
  /** messages.lesson_id: the lesson it is about (null for a pause: a course, not one lesson). */
  lessonId: string | null;
  /** The time it names: the new start, the cancelled lesson, the first lesson taken / back. */
  at: Date;
  /** lesson_rescheduled only: the old start. */
  from?: Date;
  /** Each teacher with the time their own message names (a pause: their own first lesson taken). */
  teachers: readonly { teacher: NoticeTeacher; at: Date }[];
  students: readonly NoticeStudent[];
  /**
   * The family gets this notice's WhatsApp. False only for a move whose booking confirmation went
   * instead (FamilyMoveNotice): one family message per move. Their bells go either way.
   */
  familyWhatsApp: boolean;
  /** Who made the change: no push to them about it (they still get the WhatsApp, owner: «both»). */
  actorId: string | null;
  /** Only the teachers or only the family (ScheduleChange.audience); absent: both. */
  audience?: 'teacher' | 'family';
}
