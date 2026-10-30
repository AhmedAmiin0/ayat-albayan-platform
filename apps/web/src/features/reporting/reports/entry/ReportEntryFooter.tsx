import type { ReportFormResponse } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { SaveStatus } from '../history/ReportStatusLine';
import { FooterAlerts } from './FooterAlerts';
import type { ReportEntryState } from './use-report-entry';

function submitLabel(s: ReportEntryState): string {
  if (s.submit.isPending) return t.reports.submitting;
  return s.report.status === 'draft' ? t.reports.submit : t.reports.resubmit;
}

/**
 * The end of a student's report: what stops the submit (validation, the lesson not started yet,
 * an API refusal), the sent state, then «إرسال التقرير» / «حفظ التعديل» and the autosave line.
 */
export function ReportEntryFooter({ s, block, tz }: { s: ReportEntryState; block: ReportFormResponse['submit_block']; tz: string }) {
  const { report } = s;
  return (
    <footer className="grid gap-3 border-t border-rule pt-4">
      <FooterAlerts problem={s.problem} error={s.submit.error} block={block} report={report} tz={tz} />
      <div className="flex flex-wrap items-center gap-3">
        {report.can_edit && (
          <Button type="button" size="lg" disabled={block !== null || s.submit.isPending} onClick={s.send}>
            {submitLabel(s)}
          </Button>
        )}
        {report.status === 'draft' && <SaveStatus state={s.saveState} tz={tz} />}
      </div>
    </footer>
  );
}
