import { clockTime, lessonWhenText, pdfStatusStyle, reportStatusStyle, type ReportView } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import type { SaveState } from './use-autosave';

/** «بيتحفظ…» / «المسودة اتحفظت 17:42» / a failed save, while the report is a draft (R-REP-02). */
export function SaveStatus({ state, tz }: { state: SaveState; tz: string }) {
  if (state.kind === 'idle') return null;
  const text =
    state.kind === 'saving'
      ? t.reports.autosaving
      : state.kind === 'saved'
        ? t.reports.draftSaved.replace('{time}', clockTime(state.at, tz))
        : t.reports.saveFailed;
  return (
    <p role="status" className={state.kind === 'failed' ? 'text-xs text-danger' : 'text-xs text-ink-3'}>
      {text}
    </p>
  );
}

/**
 * After a submit: «التقرير اتبعت», the version, the PDF state, and how long the teacher may still
 * edit («تقدر تعدّل التقرير لحد …» or «مدة التعديل خلصت»).
 */
export function SubmittedNote({ report, tz }: { report: ReportView; tz: string }) {
  if (report.status !== 'submitted') return null;
  const until = report.edit_until ? new Date(report.edit_until) : null;
  const window =
    !report.can_edit ? t.reports.editClosed : until ? t.reports.editUntil.replace('{when}', lessonWhenText(until, tz, locale)) : null;
  return (
    <div className="grid gap-1.5">
      <p role="status" className="flex flex-wrap items-center gap-2">
        <StatusChip {...reportStatusStyle.submitted} label={t.reports.submitted} />
        <span className="text-xs text-ink-3">{t.reports.version.replace('{n}', String(report.version))}</span>
        {report.pdf_status && (
          <StatusChip {...pdfStatusStyle[report.pdf_status]} size="sm" label={`${t.reports.pdfLabel}: ${t.enums.pdfStatus[report.pdf_status]}`} />
        )}
      </p>
      {window && (
        <p className="flex items-center gap-1.5 text-xs text-ink-2">
          <NuqtaGlyph shape="hollow" className="text-ink-3" />
          {window}
        </p>
      )}
    </div>
  );
}
