import type { TrialDateResult } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { useChatReturn } from '@/features/teaching/booking/mode';
import { pickedText } from '@/features/teaching/booking/steps/slots/SlotStep';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface TrialDonePanelProps {
  result: TrialDateResult;
  /** The family's zone, for the new time beside Riyadh's. */
  tz: string;
}

/** After POST {base}/trial-date: booked or moved, the new time, the guardian's confirmation, «إغلاق». */
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
