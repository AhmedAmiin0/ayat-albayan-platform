import { warnsTrialDate } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import type { TrialDateDraft } from '../draft';
import { pickedText } from '../SlotStep';

export interface TrialDateNotesProps {
  trial: TrialDateDraft;
  /** The family's zone (the draft's), for the moved trial's time. */
  tz: string;
}

/**
 * What «احجز الموعد الجديد» does (owner 2026-10-25): it moves the upcoming trial (kept in the
 * history as «نُقلت»), or books a new trial lesson; from the 3rd date on, a warning (never a block).
 */
export function TrialDateNotes({ trial, tz }: TrialDateNotesProps) {
  const moves = trial.upcomingId !== null;
  const when = trial.upcomingAt ? pickedText(trial.upcomingAt, tz) : '—';
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
