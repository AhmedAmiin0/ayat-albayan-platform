import { CRM_REPORT_TEMPLATES, crmTemplateLanguage, crmTemplateName, isCrmReportName } from '@ab/shared';
import { badParams } from '@/modules/messaging/whatsapp/messages/wa-components';
import { WaError, type MediaSend, type TemplateSend } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { WabaTemplate } from './waba-template';

// The lesson report like the old Apps Script (docs/19 «crm driver», «CRM → Meta»): when
// report_ready's WABA name is the old report_session, the PDF goes as a document message, then
// report_trial_session (a trial lesson) or report_session (a regular one) without variables.
// Both drivers send it so.

export interface WabaReport {
  document: MediaSend;
  template: WabaTemplate;
}

/** report_ready pointed at one of the old script's report templates. */
const oldFlow = (t: TemplateSend['template']): boolean =>
  t.key === 'report_ready' && isCrmReportName(crmTemplateName(t));

/** The PDF by its signed link and file name; refused (132000) when either is missing. */
function reportFile(input: TemplateSend): MediaSend {
  const doc = input.params.document;
  if (!doc || !input.documentUrl) throw badParams('report_ready: the document is missing');
  return { to: input.to, url: input.documentUrl, filename: doc.filename };
}

/** null = not the old flow (any other template, or report_ready on its own name). */
export function wabaReport(input: TemplateSend): WabaReport | null {
  if (!oldFlow(input.template)) return null;
  const document = reportFile(input);
  const name = CRM_REPORT_TEMPLATES[input.params.crm?.report ?? 'regular'];
  const language = crmTemplateLanguage(input.template);
  return { document, template: { name, language, body: [], header: null, buttons: [] } };
}

const REFUSED =
  'the report PDF was sent, the line refused its template (a retry sends the PDF again)';
const UNKNOWN =
  'the report PDF was sent, its template may have gone too: check WhatsApp before a retry ' +
  '(it sends both again)';
const NO_INFO: WaError['info'] = { code: null, status: 0 };

/**
 * The PDF went out, its template did not surely go: never resent automatically (the PDF would go
 * twice), so the row fails as `uncertain` for the admin. The text says whether the template surely
 * failed (a refusal with a code, a held key) or may have gone (timeout, 5xx, a 2xx without an id),
 * and that a retry sends the PDF again. The driver's code, the credential flag and the template
 * name are kept.
 */
export function afterDocument(error: unknown): WaError {
  const known = error instanceof WaError;
  const inner = known ? error.info : NO_INFO;
  const said = error instanceof Error ? error.message : String(error);
  const details = [said, inner.details].filter(Boolean).join(' — ');
  const message = known && !inner.uncertain ? REFUSED : UNKNOWN;
  const { code, status, crmCode, credential, template } = inner;
  const info = { code, status, crmCode, credential, template, uncertain: true, details };
  return new WaError(message, info);
}

interface ReportSteps<T> {
  document: () => Promise<unknown>;
  template: () => Promise<T>;
}

/** The PDF, then its template; a template failure after the PDF is afterDocument. */
export async function sendReport<T>(steps: ReportSteps<T>): Promise<T> {
  await steps.document();
  try {
    return await steps.template();
  } catch (e) {
    throw afterDocument(e);
  }
}
