import { isOpenLesson, LESSON_STATUSES, type LessonView } from '@ab/shared';
import { z } from 'zod';

// docs/46 C3/C4/C5: the teacher's own routes (self.teacher), never the admin's /lessons/:id/cancel.

export const teacherLessonPaths = {
  /** POST {reason}: one lesson, before its start (D3). */
  cancel: (lessonId: string) => `/teachers/me/lessons/${lessonId}/cancel`,
  /** POST: «سأحضر» (D1), before the start; never changes the status. */
  confirm: (lessonId: string) => `/teachers/me/lessons/${lessonId}/confirm-attendance`,
  /** GET ?month=YYYY-MM: her own lessons with one of her students (StudentAttendanceTable). */
  attendance: (studentId: string) => `/teachers/me/students/${studentId}/attendance`,
  /** GET: the student file's head (docs/47): name, status, course, the next 14 days. */
  student: (studentId: string) => `/teachers/me/students/${studentId}`,
} as const;

type ActionLesson = Pick<LessonView, 'status' | 'starts_at' | 'teacher_confirmed_at'>;

/** «سأحضر» and «إلغاء الحلقة» show while the lesson is open and has not started. */
export const teacherCanAct = (lesson: ActionLesson, now: Date): boolean =>
  isOpenLesson(lesson.status) && Date.parse(lesson.starts_at) > now.getTime();

/** She already said «سأحضر» (cleared when the lesson is moved). */
export const teacherConfirmed = (lesson: ActionLesson): boolean =>
  (lesson.teacher_confirmed_at ?? null) !== null;

/** «سأحضر» is offered: she can act and has not confirmed yet. */
export const teacherCanConfirm = (lesson: ActionLesson, now: Date): boolean =>
  teacherCanAct(lesson, now) && !teacherConfirmed(lesson);

/**
 * She said «سأحضر», from the lesson as last read, or from the confirm's own answer until the
 * re-read lesson arrives (only for the same start: a moved lesson drops it, review 11-11).
 */
export const confirmedNow = (lesson: ActionLesson, answer: ActionLesson | undefined): boolean =>
  teacherConfirmed(lesson) || (answer?.starts_at === lesson.starts_at && teacherConfirmed(answer));

/** «حضورك مؤكَّد» shows only while she can still act (open and ahead), as on the phone. */
export const confirmedChipShown = (
  lesson: ActionLesson,
  o: { answer: ActionLesson | undefined; now: Date },
): boolean => confirmedNow(lesson, o.answer) && teacherCanAct(lesson, o.now);

/** The fields of the confirm's answer (a LessonView) the chip reads, parsed at the boundary. */
export const confirmAnswerSchema = z.object({
  status: z.enum(LESSON_STATUSES),
  starts_at: z.string(),
  teacher_confirmed_at: z.string().nullable().optional(),
});

/**
 * The cancel's answer (a LessonView), parsed at the boundary: the fields a write-through cancel
 * puts on the cached row so it closes before the refetch (docs/48). An unexpected shape patches
 * nothing; the refetch still comes.
 */
export const cancelAnswerSchema = z.object({
  id: z.string(),
  status: z.enum(LESSON_STATUSES),
  cancel_reason: z.string().nullable(),
});
