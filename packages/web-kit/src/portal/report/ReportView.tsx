import { Icon, Button } from '#/components/ui/index.ts';
import { LessonReportView } from '#/report/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { FileButtons, type PortalFile } from './FileButtons';

export interface OpenReport {
  reportId: string;
  recordingId: string | null;
}

interface Props {
  studentId: string;
  report: OpenReport;
  onBack: () => void;
  /** The back button's words; «العودة إلى الحلقات» (the staff child page) by default. */
  backLabel?: string;
}

/**
 * «تقرير الحلقة» (docs/50 §6): the same content as the parents' PDF from the report's live page
 * (with its PDF and the teacher's files), then the recording when staff made it visible. When the
 * page cannot be read, the PDF still opens by the portal's own signed link.
 */
export function ReportView({ studentId, report, onBack, backLabel }: Props) {
  const recording: PortalFile[] = report.recordingId
    ? [{ kind: 'recordings', id: report.recordingId }]
    : [];
  const fallback = (
    <div className="grid gap-3">
      <p className="text-sm text-ink-3">{t.portal.loadFailed}</p>
      <FileButtons studentId={studentId} files={[{ kind: 'reports', id: report.reportId }]} />
    </div>
  );
  return (
    <section aria-label={t.portal.reportTitle} className="grid animate-fade-up gap-4">
      <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={onBack}>
        <Icon name="chevron-right" />
        {backLabel ?? t.portal.backToLessons}
      </Button>
      <h2 className="font-display text-h3 font-bold">{t.portal.reportTitle}</h2>
      <LessonReportView reportId={report.reportId} head fallback={fallback} />
      <FileButtons studentId={studentId} files={recording} icons />
    </section>
  );
}
