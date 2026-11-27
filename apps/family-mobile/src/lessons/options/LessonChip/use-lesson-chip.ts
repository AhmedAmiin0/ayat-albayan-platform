import { lessonStatusLabel, lessonStatusLook, requestChip } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { t, usePublicConfig } from '@ab/mobile-kit';

export function useLessonChip(lesson: PortalLesson) {
  const required = usePublicConfig().lesson_confirmation_required;
  const words = { labels: t.enums.lessonStatus, upcoming: t.lessons.noConfirm.scheduled };
  return {
    waiting: requestChip(lesson) === 'pendingChip',
    look: lessonStatusLook(lesson.status, required),
    label: lessonStatusLabel(lesson.status, required, words),
  };
}
