import { requestChip } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { useLessonStatusText } from '@/lib/settings/lesson-status-text';

/** The lesson's chip: «بانتظار رد الأكاديمية» while the family's request waits, else its status. */
export function FamilyChip({ lesson }: { lesson: PortalLesson }) {
  const status = useLessonStatusText();
  if (requestChip(lesson) === 'pendingChip') {
    return <StatusChip tone="act" glyph="half" label={t.portal.actions.pendingChip} size="sm" />;
  }
  return <StatusChip {...status.chip(lesson.status)} size="sm" />;
}
