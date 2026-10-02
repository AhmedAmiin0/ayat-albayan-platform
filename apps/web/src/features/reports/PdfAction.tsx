import { pdfStatusStyle, type ReportSummaryView, type UserRole } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { pdfUrl, REPORTS_KEY, reportErrorText, retryPdf } from './api';

/**
 * The report's PDF (R6, R12): «تحميل PDF» once ready, else its state; a failed one is the admin's
 * to retry («جهّز الـPDF تاني»).
 */
export function PdfAction({ report, role }: { report: Pick<ReportSummaryView, 'id' | 'pdf_status'>; role: UserRole }) {
  const queryClient = useQueryClient();
  const open = useMutation({
    mutationFn: () => pdfUrl(report.id),
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
  });
  const retry = useMutation({
    mutationFn: () => retryPdf(report.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...REPORTS_KEY, 'student'] }),
  });
  const status = report.pdf_status;
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={open.isPending} onClick={() => open.mutate()}>
          {t.reports.downloadPdf}
        </Button>
        {open.error && <span className="text-xs text-danger">{reportErrorText(open.error)}</span>}
      </span>
    );
  }
  if (!status) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusChip {...pdfStatusStyle[status]} size="sm" label={`${t.reports.pdf}: ${t.enums.pdfStatus[status]}`} />
      {status === 'failed' && role === 'admin' && (
        <Button type="button" variant="secondary" size="sm" disabled={retry.isPending} onClick={() => retry.mutate()}>
          {t.reports.retryPdf}
        </Button>
      )}
    </span>
  );
}
