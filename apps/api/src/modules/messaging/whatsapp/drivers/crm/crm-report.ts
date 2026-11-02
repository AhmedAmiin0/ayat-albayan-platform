import { CRM_REPORT_TEMPLATES, crmTemplateLanguage, crmTemplateName, isCrmReportName } from '@ab/shared';
import { crmMediaBody, type CrmBody } from './crm-body';
import { badParams } from '../../messages/wa-components';
import { WaError, type TemplateSend } from '../../whatsapp.types';

// The lesson report like the old Apps Script (docs/19 «crm driver»): on a crm line whose report_ready the
// admin pointed at the CRM's report_session (crm_name), the PDF goes as a document message, then the CRM
// template report_trial_session (a trial lesson) or report_session (a regular one), without variables.

interface CrmReportBodies {
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
 * The PDF went out, its template did not surely go: never resent automatically (the PDF would go twice), so the
 * row fails as `uncertain` for the admin. The text says whether the template surely failed (the CRM refused it:
 * its code, a held key) or may have gone (timeout, 5xx, a 2xx without wamid: check the CRM first), and that a
 * retry sends the PDF again. The CRM's code and the credential flag are kept.
 */
export function afterDocument(error: unknown): WaError {
  const inner = error instanceof WaError ? error.info : null;
  const said = error instanceof Error ? error.message : String(error);
  const details = [said, inner?.details].filter(Boolean).join(' — ');
  const message = inner && !inner.uncertain ? REFUSED : UNKNOWN;
  return new WaError(message, { code: inner?.code ?? null, status: inner?.status ?? 0, crmCode: inner?.crmCode, credential: inner?.credential, template: inner?.template, uncertain: true, details });
}

const REFUSED = 'the report PDF was sent, the CRM refused its template (a retry sends the PDF again)';
const UNKNOWN = 'the report PDF was sent, its CRM template may have gone too: check the CRM before a retry (it sends both again)';
