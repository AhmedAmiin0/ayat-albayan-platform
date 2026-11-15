import { z } from 'zod';

const lessonId = z.guid();

/**
 * /teacher-report/<param> (owner 2026-11-14): a lesson id is the link teacher_lesson_v3 sends now
 * (its Meta button base is fixed), opened as the signed-in /teacher/report/<id>; null = a signed
 * token sent before, which keeps the no-login form until it expires.
 */
export const linkLessonId = (param: string): string | null => {
  const parsed = lessonId.safeParse(param);
  return parsed.success ? parsed.data : null;
};
