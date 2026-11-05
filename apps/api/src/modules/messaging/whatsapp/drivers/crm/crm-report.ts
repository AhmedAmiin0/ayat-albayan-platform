import { crmMediaBody, crmTemplate, type CrmBody } from './crm-body';
import { wabaReport } from '@/modules/messaging/whatsapp/drivers/waba/waba-report';
import type { TemplateSend } from '@/modules/messaging/whatsapp/whatsapp.types';

// The lesson report like the old Apps Script (docs/19 «crm driver»), in the CRM's bodies: the PDF as a
// document message, then report_trial_session / report_session without variables (waba-report.ts,
// the same two sends the meta driver makes).

interface CrmReportBodies {
  document: CrmBody;
  template: CrmBody;
}

/** null = not the old script's report flow (any other template, or report_ready on its own CRM name). */
export function crmReportBodies(input: TemplateSend): CrmReportBodies | null {
  const report = wabaReport(input);
  if (!report) return null;
  return {
    // The CRM keeps its own file name (docs/19 limits): ours is sent, it may not be shown.
    document: crmMediaBody(report.document),
    template: { to: input.to, type: 'template', template: crmTemplate(report.template) },
  };
}
