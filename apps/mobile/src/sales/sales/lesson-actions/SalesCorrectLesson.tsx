import { Note } from '@/more';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { CorrectAutoHeld, rescheduleFailure } from '@/teaching';
import { useSalesCancel } from './lesson-actions-api';

/**
 * Sales' «لم تنعقد الحلقة؟» (owner 2026-11-02, no confirmation required): a held lesson
 * recorded as cancelled by its teacher or excused by the student (POST /sales/lessons/:id/
 * cancel { by }). The sales row carries no auto_held, so any held lesson offers it: one held
 * for real (manually or with a report) answers 409 not_auto_held, said in words.
 */
export function SalesCorrectLesson({ lessonId }: { lessonId: string }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const cancel = useSalesCancel(lessonId);
  if (cancel.isSuccess) return <Note alert>{t.lessons.correct.done}</Note>;
  const failure = cancel.isError ? rescheduleFailure(cancel.error, cycle, tz) : null;
  return (
    <CorrectAutoHeld
      busy={cancel.isPending}
      error={failure?.kind === 'error' ? failure.text : undefined}
      onCorrect={(by) => cancel.mutate({ by })}
    />
  );
}
