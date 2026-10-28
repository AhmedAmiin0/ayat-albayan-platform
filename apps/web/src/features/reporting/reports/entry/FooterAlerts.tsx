import type { ReportFormResponse, ReportView } from '@ab/shared';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { reportErrorText } from '../api';
import { SubmittedNote } from '../history/ReportStatusLine';

const ERRORS: Record<string, string> = t.reports.error;

export interface FooterAlertsProps {
  /** The form's own check before sending (a reports.error key). */
  problem: string | null;
  /** The API's refusal of the last send. */
  error: unknown;
  block: ReportFormResponse['submit_block'];
  report: ReportView;
  tz: string;
}

/** What stops a send (the check, the API, the lesson not started yet), then the sent state. */
export function FooterAlerts({ problem, error, block, report, tz }: FooterAlertsProps) {
  return (
    <>
      {problem && <FormAlert>{ERRORS[problem] ?? t.common.error}</FormAlert>}
      {error ? <FormAlert>{reportErrorText(error)}</FormAlert> : null}
      {block && <FormAlert>{ERRORS[block]}</FormAlert>}
      <SubmittedNote report={report} tz={tz} />
    </>
  );
}
