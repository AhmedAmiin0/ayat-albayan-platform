import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { LESSONS_KEY } from './api';
import type { TimeEditResult } from './edit-time.contract';

/** Toast line after a save: «اتعدّل» and, when a guardian message was queued, that it was. */
export const savedMessage = (r: Pick<TimeEditResult, 'notified'>): string =>
  r.notified > 0 ? t.lessons.timeEdit.savedNotified : t.lessons.timeEdit.saved;

/** A save that leaves something for the admin to do (payout draft, refreshed report file). */
export const needsFollowUp = (r: TimeEditResult): boolean => r.payout === 'draft_stale' || r.pdf_refresh;

export interface EditTimeDoneProps {
  result: TimeEditResult;
  onClose: (message: string) => void;
}

/**
 * Success state (R-SCH-11): what was saved plus the follow-ups that must not vanish in a toast,
 * «احسب مستحقات الشهر» again for a draft month and the report file refresh. The grid refreshes
 * when this closes: a lesson moved to another week would drop out of the list (and the drawer
 * with it) before the admin had read this.
 */
export function EditTimeDone({ result, onClose }: EditTimeDoneProps) {
  const queryClient = useQueryClient();
  const title = useRef<HTMLParagraphElement>(null);
  useEffect(() => title.current?.focus(), []);
  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    },
    [queryClient],
  );
  const message = savedMessage(result);
  return (
    <section aria-label={t.lessons.timeEdit.saved} className="grid gap-3">
      <p ref={title} role="status" tabIndex={-1} className="rounded-md bg-sunk px-3.5 py-2.5 text-sm font-semibold outline-none">
        {message}
      </p>
      {result.payout === 'draft_stale' && <p className="text-sm">{t.lessons.timeEdit.payoutDraft}</p>}
      {result.pdf_refresh && <p className="text-sm">{t.lessons.timeEdit.pdfRefresh}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={() => onClose(message)}>
          {t.lessons.timeEdit.close}
        </Button>
      </div>
    </section>
  );
}
