import type { CorrectTo } from '@ab/schedule';
import { Note } from '@/more';
import { t } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { CorrectOutcome, rescheduleFailure } from '@/teaching';
import { useSalesCorrect } from './lesson-actions-api';

interface SalesCorrectOutcomeProps {
  lessonId: string;
  targets: readonly CorrectTo[];
}

/** The sales row has no auto flag, so a hand-recorded lesson answers 409 not_auto_held. */
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
