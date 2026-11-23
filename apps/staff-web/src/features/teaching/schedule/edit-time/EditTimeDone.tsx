import type { TimeEditResult } from '@ab/schedule';
import { zonedPartsIn } from '@ab/time';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Button, buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LESSONS_KEY } from '@/features/teaching/schedule/api';
import { whenWithLength } from './edit-time-text';
import { durationMin } from '@/features/teaching/schedule/lesson/lessons';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { focusOnMount } from '@/lib/dom/mount-refs';

/** Mentions the guardian message only when one was queued. */
export const savedMessage = (r: Pick<TimeEditResult, 'notified'>): string =>
  r.notified > 0 ? t.lessons.timeEdit.savedNotified : t.lessons.timeEdit.saved;

/** A save that leaves something for the admin to do (payout draft, refreshed report file). */
export const needsFollowUp = (r: TimeEditResult): boolean => r.payout === 'draft_stale' || r.pdf_refresh;

export interface EditTimeDoneProps {
  result: TimeEditResult;
  onClose: (message: string) => void;
}

/** Follow-ups stay off the toast; the grid refreshes on close so a moved lesson stays readable. */
export function EditTimeDone({ result, onClose }: EditTimeDoneProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const queryClient = useQueryClient();
  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    },
    [queryClient],
  );
  const message = savedMessage(result);
  const { lesson } = result;
  const month = zonedPartsIn(new Date(lesson.starts_at), lesson.teacher.tz).date.slice(0, 7);
  return (
    <section aria-label={t.lessons.timeEdit.saved} className="grid gap-3">
      <div className="flex items-start gap-2 rounded-md bg-sunk px-3.5 py-2.5">
        <NuqtaGlyph shape="fill" className="mt-1.5 text-ok" />
        <div className="grid gap-1">
          <p ref={focusOnMount} role="status" tabIndex={-1} className="text-sm font-semibold outline-none">
            {message}
          </p>
          <p className="text-sm">{t.lessons.timeEdit.newWhen.replace('{when}', whenWithLength(lesson.starts_at, durationMin(lesson), clock))}</p>
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
