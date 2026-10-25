import { pdfStatusStyle, type ReportSummaryView, type UserRole } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { pdfUrl, REPORTS_KEY, reportErrorText, retryPdf } from './api';

/**
 * The report's PDF (R6, R12): «تحميل PDF» once ready, else its state; a failed one is the admin's
 * to retry («جهّز الـPDF تاني»).
 */
export function PdfAction({ report, role }: { report: Pick<ReportSummaryView, 'id' | 'pdf_status'>; role: UserRole }) {
  const queryClient = useQueryClient();
  const open = useMutation({ mutationFn: () => pdfUrl(report.id) });
  // The tab opens inside the click (a phone's popup blocker allows that, not one opened after an
  // await) and goes to the signed URL once it is in; the URL saves the file under its report name.
  const download = () => {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    open.mutate(undefined, {
      onSuccess: ({ url }) => (tab ? tab.location.assign(url) : window.location.assign(url)),
      onError: () => tab?.close(),
    });
  };
  const retry = useMutation({
    mutationFn: () => retryPdf(report.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...REPORTS_KEY, 'student'] }),
  });
  const status = report.pdf_status;
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={open.isPending} onClick={download}>
          {t.reports.downloadPdf}
        </Button>
        {open.error && <span className="text-xs text-danger">{reportErrorText(open.error)}</span>}
      </span>
    );
  }
  if (!status) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusChip {...pdfStatusStyle[status]} size="sm" label={`${t.reports.pdfLabel}: ${t.enums.pdfStatus[status]}`} />
      {status === 'failed' && role === 'admin' && (
        <Button type="button" variant="secondary" size="sm" disabled={retry.isPending} onClick={() => retry.mutate()}>
          {t.reports.retryPdf}
        </Button>
      )}
    </span>
  );
}
