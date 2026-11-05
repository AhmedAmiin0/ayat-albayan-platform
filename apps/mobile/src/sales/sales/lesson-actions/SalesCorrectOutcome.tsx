import type { CorrectTo } from '@ab/shared';
import { Note } from '@/more';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { CorrectOutcome, rescheduleFailure } from '@/teaching';
import { useSalesCorrect } from './lesson-actions-api';

interface SalesCorrectOutcomeProps {
  lessonId: string;
  targets: readonly CorrectTo[];
}

/**
 * Sales' «تصحيح حالة الحلقة» (owner 2026-11-03, POST /sales/lessons/:id/correct { to }). The sales
 * row carries no auto flag, so a held / absent lesson offers it: one recorded by hand or with a
 * report answers 409 not_auto_held, said in words.
 */
export function SalesCorrectOutcome({ lessonId, targets }: SalesCorrectOutcomeProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const correct = useSalesCorrect(lessonId);
  if (correct.isSuccess) return <Note alert>{t.lessons.correct.done}</Note>;
  const failure = correct.isError ? rescheduleFailure(correct.error, cycle, tz) : null;
  return (
    <CorrectOutcome
      targets={targets}
      busy={correct.isPending}
      error={failure?.kind === 'error' ? failure.text : undefined}
      onCorrect={(to) => correct.mutate(to)}
    />
  );
}
