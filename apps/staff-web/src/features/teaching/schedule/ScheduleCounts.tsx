import { counted } from '@ab/core';
import type { LessonView } from '@ab/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useLessonStatusText } from '@ab/web-kit/lib/settings/lesson-status-text';
import { needsConfirmCount } from './lesson/lessons';

/**
 * «5 حلقات» and, in saffron (دورك), «2 يحتاج تأكيد» (only while a confirmation is required). No
 * lessons shows nothing, never «0 حلقة».
 */
export function ScheduleCounts({ shown }: { shown: readonly LessonView[] }) {
  const waiting = needsConfirmCount(shown, useLessonStatusText().required);
  if (shown.length === 0) return null;
  return (
    <>
      <span className="text-sm text-ink-3 tabular-nums">{counted(t.schedule.lessonCount, shown.length)}</span>
      {waiting > 0 && (
        <span className="text-sm font-bold text-act tabular-nums">{t.schedule.needsConfirmCount.replace('{n}', String(waiting))}</span>
      )}
    </>
  );
}
