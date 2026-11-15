import { reportV2Lines } from '@ab/client-core';
import type { ReportFormEntry, ReportFormLesson } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { AttachmentsField } from '@/features/reporting/reports/entry/AttachmentsField';
import { V2Header } from '@/features/reporting/reports/entry-v2/V2Header';
import { PdfAction } from '@/features/reporting/reports/history/PdfAction';
import { SubmittedNote } from '@/features/reporting/reports/history/ReportStatusLine';

export interface ReportV2ViewProps {
  lesson: ReportFormLesson;
  entry: ReportFormEntry;
  /** The viewer's zone for the edit window. */
  tz: string;
}

/**
 * A new-form report as the admin reads it (read-only): the «النموذج الجديد» badge, then its lines
 * in the form's order (reportV2Lines, shared with the mobile app), the files and the PDF.
 */
export function ReportV2View({ lesson, entry, tz }: ReportV2ViewProps) {
  const { report } = entry;
  const lines = reportV2Lines(report, { v2: t.reports.v2, grade: t.enums.grade, program: t.enums.program, lang: locale });
  return (
    <article aria-label={t.reports.entryFor.replace('{name}', entry.student.name)} className="grid max-w-3xl gap-4">
      <V2Header lesson={lesson} entry={entry} />
      <StatusChip tone="neutral" glyph="hollow" label={t.reports.v2.admin.v2Badge} className="justify-self-start" />
      <dl className="grid gap-3">
        {lines.map((l) => (
          <div key={l.key} className="grid gap-0.5 border-b border-rule pb-2 sm:grid-cols-[12rem_1fr] sm:gap-4">
            <dt className="text-sm text-ink-3">{l.label}</dt>
            <dd className={l.value ? 'text-body text-ink' : 'text-body text-ink-3'}>{l.value ?? t.mobileAdmin.reports.noContent}</dd>
          </div>
        ))}
      </dl>
      {report.attachments.length > 0 && (
        <AttachmentsField reportId={report.id} files={report.attachments} onChange={() => undefined} editable={false} />
      )}
      <SubmittedNote report={report} tz={tz} />
      {report.status === 'submitted' && <PdfAction report={report} role="admin" />}
    </article>
  );
}
