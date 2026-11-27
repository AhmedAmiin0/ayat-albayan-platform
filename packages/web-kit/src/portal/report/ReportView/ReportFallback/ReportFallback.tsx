import { t } from '@ab/web-kit/lib/i18n/i18n';
import { FileButtons } from '@ab/web-kit/portal/report/FileButtons';

/** The report page failed: the PDF still opens by signed link. */
export function ReportFallback({ studentId, reportId }: { studentId: string; reportId: string }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-3">{t.portal.loadFailed}</p>
      <FileButtons studentId={studentId} files={[{ kind: 'reports', id: reportId }]} />
    </div>
  );
}
