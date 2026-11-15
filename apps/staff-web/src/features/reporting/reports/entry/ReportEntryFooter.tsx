import type { ReportFormResponse } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { SaveStatus } from '@/features/reporting/reports/history/ReportStatusLine';
import { FooterHead } from '@/features/reporting/reports/send/FooterHead';
import { SendButton } from '@/features/reporting/reports/send/SendButton';
import type { ReportEntryState } from './use-report-entry';

export interface ReportEntryFooterProps {
  s: ReportEntryState;
  block: ReportFormResponse['submit_block'];
  tz: string;
}

/**
 * The end of a student's report: what stops the submit (validation, the lesson not started yet,
 * an API refusal), the sent state with «تعديل التقرير», then «إرسال التقرير» / «حفظ التعديل»
 * (disabled with a spinner while pending) and the autosave line.
 */
export function ReportEntryFooter({ s, block, tz }: ReportEntryFooterProps) {
  const { report, mode } = s;
  const label = report.status === 'draft' ? t.reports.submit : t.reports.resubmit;
  return (
    <footer className="grid gap-3 border-t border-rule pt-4">
      <FooterHead s={s} block={block} tz={tz} />
      <div className="flex flex-wrap items-center gap-3">
        {!mode.locked && (
          <SendButton label={label} pending={s.submit.isPending} disabled={block !== null}
            onClick={s.send} />
        )}
        {report.status === 'draft' && <SaveStatus state={s.saveState} tz={tz} />}
      </div>
    </footer>
  );
}
