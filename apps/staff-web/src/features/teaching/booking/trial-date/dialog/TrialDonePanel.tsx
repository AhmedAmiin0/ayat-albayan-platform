import type { TrialDateResult } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useChatReturn } from '@/features/teaching/booking/mode';
import { pickedText } from '@/features/teaching/booking/steps/slots/SlotStep';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

export interface TrialDonePanelProps {
  result: TrialDateResult;
  /** The family's zone, for the new time beside Riyadh's. */
  tz: string;
}

export function TrialDonePanel({ result, tz }: TrialDonePanelProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const close = useChatReturn();
  return (
    <section aria-labelledby="trial-done-title" data-testid="trial-date-done" className="grid justify-items-start gap-3 py-2">
      <h2 id="trial-done-title" role="status" className="flex items-center gap-2 font-display text-h3 font-bold">
        <NuqtaGlyph shape="fill" className="text-ok" />
        <span>{result.moved_from_id ? t.trialDate.doneMoved : t.trialDate.done}</span>
      </h2>
      <p>{pickedText(result.starts_at, tz, clock)}</p>
      <p className="text-sm text-ink-2">{t.trialDate.doneNote}</p>
      {close && (
        <Button type="button" onClick={close}>
          {t.trialDate.close}
        </Button>
      )}
    </section>
  );
}
