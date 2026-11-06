import type { ReportFormResponse, ReportView } from '@ab/shared';
import { FooterAlerts } from '@/features/reporting/reports/entry/FooterAlerts';
import type { ReportMode } from './use-report-mode';
import { SentPanel } from './SentPanel';

/** What both report footers read from their entry hook. */
interface SendState {
  report: ReportView;
  mode: ReportMode;
  problem: string | null;
  submit: { error: unknown; isPending: boolean };
}

export interface FooterHeadProps {
  s: SendState;
  block: ReportFormResponse['submit_block'];
  tz: string;
}

/** The top of a report's footer: what stops the send, then the sent state with «تعديل التقرير». */
export function FooterHead({ s, block, tz }: FooterHeadProps) {
  const { report, mode } = s;
  return (
    <>
      <FooterAlerts problem={s.problem} error={s.submit.error} block={block} report={report}
        tz={tz} />
      <SentPanel report={report} mode={mode.mode} onEdit={mode.startEdit} tz={tz}
        busy={s.submit.isPending} />
    </>
  );
}
