import type { ReportView } from '@ab/shared';
import { pdfStatusStyle, reportStatusStyle } from '@ab/money';
import { clockOf } from '@ab/time';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { SaveState } from '@/features/reporting/reports/entry/use-autosave';
import { useClock } from '@ab/web-kit/lib/clock';
import { WindowLines } from '@/features/reporting/reports/send/WindowLines';
import { useWindowClose } from '@/features/reporting/reports/send/use-window-close';

/** Draft save status (R-REP-02). */
export function SaveStatus({ state, tz }: { state: SaveState; tz: string }) {
  const clock = useClock();
  if (state.kind === 'idle') return null;
  const text =
    state.kind === 'saving'
      ? t.reports.autosaving
      : state.kind === 'saved'
        ? t.reports.draftSaved.replace('{time}', clockOf(state.at, { tz, ...clock }))
        : t.reports.saveFailed;
  return (
    <p role="status" className={state.kind === 'failed' ? 'text-xs text-danger' : 'text-xs text-ink-3'}>
      {text}
    </p>
  );
}

/** The PDF chip once it says something (ready, or failed): not while it waits for the close. */
const PDF_SHOWN: ReadonlySet<string> = new Set(['ready', 'failed']);

/** At the edit window's close the form and the lists are fetched again (useWindowClose). */
export function SubmittedNote({ report, tz }: { report: ReportView; tz: string }) {
  useWindowClose(report);
  if (report.status !== 'submitted') return null;
  const pdf = report.pdf_status && PDF_SHOWN.has(report.pdf_status) ? report.pdf_status : null;
  return (
    <div className="grid gap-1.5">
      <p role="status" className="flex flex-wrap items-center gap-2">
        <StatusChip {...reportStatusStyle.submitted} label={t.reports.submitted} />
        <span className="text-xs text-ink-3">{t.reports.version.replace('{n}', String(report.version))}</span>
        {pdf && (
          <StatusChip {...pdfStatusStyle[pdf]} size="sm" label={`${t.reports.pdfLabel}: ${t.enums.pdfStatus[pdf]}`} />
        )}
      </p>
      <WindowLines report={report} tz={tz} />
    </div>
  );
}
