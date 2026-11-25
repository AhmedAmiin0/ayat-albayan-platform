import { counted } from '@ab/core';
import type { LessonView } from '@ab/schedule';
import { t, useLessonStatusText } from '@ab/web-kit';
import { needsConfirmCount } from './lesson/lessons';

/** Needs-confirmation only while required; no lessons shows nothing, never zero. */
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
