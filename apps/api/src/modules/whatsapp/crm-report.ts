import { CRM_REPORT_TEMPLATES, crmTemplateLanguage, crmTemplateName, isCrmReportName } from '@ab/shared';
import { crmMediaBody, type CrmBody } from './crm-body';
import { badParams } from './wa-components';
import { WaError, type TemplateSend } from './whatsapp.types';

// The lesson report like the old Apps Script (docs/19 «crm driver»): on a crm line whose report_ready the
// admin pointed at the CRM's report_session (crm_name), the PDF goes as a document message, then the CRM
// template report_trial_session (a trial lesson) or report_session (a regular one), without variables.

export interface CrmReportBodies {
  document: CrmBody;
  template: CrmBody;
}

/** null = not the old script's report flow (any other template, or report_ready on its own CRM name). */
export function crmReportBodies(input: TemplateSend): CrmReportBodies | null {
  const { template, params } = input;
  if (template.key !== 'report_ready' || !isCrmReportName(crmTemplateName(template))) return null;
  const doc = params.document;
  if (!doc || !input.documentUrl) throw badParams('report_ready: the document is missing');
  const name = CRM_REPORT_TEMPLATES[params.crm?.report ?? 'regular'];
  return {
    // The CRM keeps its own file name (docs/19 limits): ours is sent, it may not be shown.
    document: crmMediaBody({ to: input.to, url: input.documentUrl, filename: doc.filename }),
    template: { to: input.to, type: 'template', template: { name, language: crmTemplateLanguage(template), params: {} } },
  };
}

/**
 * The PDF went out but its template did not: never resent automatically (the PDF would go twice), so the row
 * fails as `uncertain` for the admin, with what the CRM said.
 */
export function afterDocument(error: unknown): WaError {
  const said = error instanceof Error ? error.message : String(error);
  const details = error instanceof WaError ? [said, error.info.details].filter(Boolean).join(' — ') : said;
  return new WaError('the report PDF was sent, its CRM template was not', { code: null, status: 0, uncertain: true, details });
}
