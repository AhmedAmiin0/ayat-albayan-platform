import { isOpenLesson, type LessonView } from '@ab/shared';

// docs/46 C3/C4/C5: the teacher's own routes (self.teacher), never the admin's /lessons/:id/cancel.

export const teacherLessonPaths = {
  /** POST {reason}: one lesson, before its start (D3). */
  cancel: (lessonId: string) => `/teachers/me/lessons/${lessonId}/cancel`,
  /** POST: «سأحضر» (D1), before the start; never changes the status. */
  confirm: (lessonId: string) => `/teachers/me/lessons/${lessonId}/confirm-attendance`,
  /** GET ?month=YYYY-MM: her own lessons with one of her students (StudentAttendanceTable). */
  attendance: (studentId: string) => `/teachers/me/students/${studentId}/attendance`,
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
