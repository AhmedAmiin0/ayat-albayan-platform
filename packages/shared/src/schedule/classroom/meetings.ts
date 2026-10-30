import { z } from 'zod';
import { lessonDuration, overrideSchema } from '../schemas/scheduling.js';
import type { JoinWindow } from './join-window.js';

// «حلقة فورية» (instant lesson), «افتح الحلقة الآن» (open the room early) and the student's own
// long-lived link («رابط دخول الطالب», /s/<token>). A meeting with students is always a lesson;
// the one exception is «اجتماع داخلي» (internal-meetings.ts): a standalone room with no lesson.

const uniqueIds = z
  .array(z.uuid())
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'duplicate_id' });

/**
 * POST /lessons/instant (admin): one lesson starting now (to the minute) for these students with
 * this teacher. 409 conflict (with `conflicts`) unless `override.reason`, like POST /booking.
 */
export const instantLessonSchema = z.object({
  studentIds: uniqueIds,
  teacherId: z.uuid(),
  durationMin: lessonDuration,
  override: overrideSchema.optional(),
  /** Idempotency key: a double click returns the first lesson (rule 8). */
  clientRequestId: z.uuid().optional(),
});
export type InstantLessonRequest = z.output<typeof instantLessonSchema>;

export interface InstantLessonResult {
  lessonId: string;
}

/** POST /lessons/:id/room/open: the lesson's window after the room was opened. */
export interface RoomOpenResult extends JoinWindow {
  room_opened_at: string;
}

/** POST /public/student/:token/join: the name is optional (the student's first name otherwise). */
export const studentJoinSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
});
export type StudentJoin = z.output<typeof studentJoinSchema>;

/** The lesson the student's link points at right now (current, else the next one). */
export interface StudentLinkLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  teacher_name: string;
  window: JoinWindow;
}

/** GET /public/student/:token. `lesson` is null when nothing is booked ahead. */
export interface StudentLinkView {
  first_name: string;
  lesson: StudentLinkLesson | null;
}

/** POST /students/:id/join-link (admin): the student's link, created or rotated. */
export interface StudentJoinLinkUrl {
  url: string;
}

/** The first word of a name: what the student's page greets with. */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';
