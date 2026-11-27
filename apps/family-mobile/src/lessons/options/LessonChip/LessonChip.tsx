import { StatusChip, t } from '@ab/mobile-kit';
import type { LessonChipProps } from './LessonChip.types';
import { useLessonChip } from './use-lesson-chip';

/** Pending family request wins; else the status per lesson_confirmation_required. */
export function LessonChip({ lesson }: LessonChipProps) {
  const { waiting, look, label } = useLessonChip(lesson);
  if (waiting) {
    return <StatusChip tone="act" glyph="half" label={t.portal.actions.pendingChip} size="sm" />;
  }
  return <StatusChip {...look} label={label} size="sm" />;
}
