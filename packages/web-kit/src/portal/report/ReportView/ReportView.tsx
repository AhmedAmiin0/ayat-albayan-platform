import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { LessonReportView } from '@ab/web-kit/report';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { FileButtons, type PortalFile } from '@ab/web-kit/portal/report/FileButtons';

export interface OpenReport {
  reportId: string;
  recordingId: string | null;
}

interface Props {
  studentId: string;
  report: OpenReport;
  onBack: () => void;
  /** The back button's words; the staff child page's wording by default. */
  backLabel?: string;
}

/** docs/50 §6: as the parents' PDF; if the page fails, the PDF opens by signed link. */
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
