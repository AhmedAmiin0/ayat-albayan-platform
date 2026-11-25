import { warnsTrialDate } from '@ab/shared';
import { NuqtaGlyph, t, useClock, useViewerTz } from '@ab/web-kit';
import type { TrialDateDraft } from '@/features/teaching/booking/draft/draft';
import { pickedText } from '@/features/teaching/booking/steps/slots/SlotStep';

export interface TrialDateNotesProps {
  trial: TrialDateDraft;
  /** The family's zone (the draft's), for the moved trial's time. */
  tz: string;
}

/** It moves the upcoming trial or books a new one; from the 3rd date a warning, never a block. */
export function TrialDateNotes({ trial, tz }: TrialDateNotesProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const moves = trial.upcomingId !== null;
  const when = trial.upcomingAt ? pickedText(trial.upcomingAt, tz, clock) : '—';
  return (
    <div className="grid gap-2">
      <p className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
        {moves ? t.trialDate.moves.replace('{when}', when) : t.trialDate.newLesson}
      </p>
      {warnsTrialDate(trial.count) && (
        <p role="note" data-testid="trial-date-warn" className="flex items-start gap-2 rounded-md bg-act-soft px-3.5 py-2.5 text-sm">
          <NuqtaGlyph shape="half" className="mt-1 shrink-0 text-act" />
          <span>{t.trialDate.warn.replace('{n}', String(trial.count + 1))}</span>
        </p>
      )}
    </div>
  );
}
