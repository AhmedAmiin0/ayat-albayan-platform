import { lessonWhenAt, type ReportView } from '@ab/shared';
import { sentMoment, type ReportFormMode } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';

export interface SentPanelProps {
  report: ReportView;
  mode: ReportFormMode;
  onEdit: () => void;
  tz: string;
  /** A send still settling: no «تعديل التقرير» until the sent version is in. */
  busy: boolean;
}

const SHOWN: ReadonlySet<ReportFormMode> = new Set(['sent', 'closed']);

/**
 * After a send (owner 2026-11-06): «تم إرسال التقرير بنجاح» with the time, then «تعديل التقرير»
 * while the edit window is open (the window line itself is in SubmittedNote).
 */
export function SentPanel({ report, mode, onEdit, tz, busy }: SentPanelProps) {
  const clock = useClock();
  const moment = sentMoment(report);
  if (!SHOWN.has(mode)) return null;
  const words = moment?.kind === 'edited' ? t.reports.editSavedOk : t.reports.sentOk;
  const time = moment ? lessonWhenAt(new Date(moment.at), { tz, ...clock }) : '';
  return (
    <div className="grid gap-2">
      {moment && (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2.5 text-sm text-ink">
          {words.replace('{time}', time)}
        </p>
      )}
      {mode === 'sent' && !busy && (
        <div className="grid justify-items-start gap-1.5">
          <Button type="button" variant="secondary" onClick={onEdit}>{t.reports.edit}</Button>
          <p className="text-xs text-ink-3">{t.reports.editHint}</p>
        </div>
      )}
    </div>
  );
}
