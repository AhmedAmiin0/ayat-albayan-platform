import { lessonActionCalls, salesLessonActionCalls } from '@ab/client-core';
import type { ConfirmRoute } from '@ab/shared';
import { apiFetch, apiSend } from '@ab/web-kit';

const salesLessons = salesLessonActionCalls({ apiFetch, apiSend });
const lessons = lessonActionCalls({ apiFetch, apiSend });

/** The viewer's confirm route, as replyRights chose it; neither sends a message. */
const CONFIRM: Record<ConfirmRoute, (lessonId: string) => Promise<unknown>> = {
  sales: (lessonId) => salesLessons.confirm(lessonId),
  admin: (id) => lessons.confirm({ id }),
};

export const confirmReplyLesson = (input: { lessonId: string; route: ConfirmRoute }) =>
  CONFIRM[input.route](input.lessonId);
