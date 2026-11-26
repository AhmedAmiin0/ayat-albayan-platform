import { lessonStatusLabel, lessonStatusLook, requestChip } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { StatusChip, t, usePublicConfig } from '@ab/mobile-kit';

/** Pending family request wins; else the status per lesson_confirmation_required. */
export function LessonChip({ lesson }: { lesson: PortalLesson }) {
  const required = usePublicConfig().lesson_confirmation_required;
  const waiting = requestChip(lesson) === 'pendingChip';
  if (waiting) {
    return <StatusChip tone="act" glyph="half" label={t.portal.actions.pendingChip} size="sm" />;
  }
  const words = { labels: t.enums.lessonStatus, upcoming: t.lessons.noConfirm.scheduled };
  const label = lessonStatusLabel(lesson.status, required, words);
  return <StatusChip {...lessonStatusLook(lesson.status, required)} label={label} size="sm" />;
}
