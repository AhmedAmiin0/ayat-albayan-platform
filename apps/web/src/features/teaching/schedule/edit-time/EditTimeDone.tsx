import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { LESSONS_KEY } from '../api';
import { whenWithLength } from './edit-time-text';
import type { TimeEditResult } from './edit-time.contract';
import { durationMin } from '../lesson/lessons';
import { zonedParts } from '../tz';

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
 * Success state (R-SCH-11): what was saved («الميعاد الجديد: …») plus the follow-ups that must not
 * vanish in a toast: «احسب مستحقات الشهر» (a link to that month on the payouts page) for a draft
 * month, and the report file refresh. The grid refreshes when this closes: a lesson moved to
 * another week would drop out of the list (and the drawer with it) before the admin had read this.
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
  const { lesson } = result;
  const month = zonedParts(new Date(lesson.starts_at), lesson.teacher.tz).date.slice(0, 7);
  return (
    <section aria-label={t.lessons.timeEdit.saved} className="grid gap-3">
      <div className="flex items-start gap-2 rounded-md bg-sunk px-3.5 py-2.5">
        <NuqtaGlyph shape="fill" className="mt-1.5 text-ok" />
        <div className="grid gap-1">
          <p ref={title} role="status" tabIndex={-1} className="text-sm font-semibold outline-none">
            {message}
          </p>
          <p className="text-sm">{t.lessons.timeEdit.newWhen.replace('{when}', whenWithLength(lesson.starts_at, durationMin(lesson)))}</p>
        </div>
      </div>
      {result.payout === 'draft_stale' && (
        <div className="grid justify-items-start gap-2">
          <p className="text-sm">{t.lessons.timeEdit.payoutDraft}</p>
          <Link to="/admin/payouts" search={{ month }} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            {t.lessons.timeEdit.payoutLink}
          </Link>
        </div>
      )}
      {result.pdf_refresh && <p className="text-sm">{t.lessons.timeEdit.pdfRefresh}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={() => onClose(message)}>
          {t.lessons.timeEdit.close}
        </Button>
      </div>
    </section>
  );
}
