import { z } from 'zod';

// The crm driver's template names (docs/19 «crm driver»). The academy CRM holds the templates of the old
// Google Apps Script («نظام تسجيل الطلاب»): most share our meta_name, two flows use the CRM's own names.

/** The CRM's name for a template when it is not its meta_name (teacher_new_student → the old script's alert). */
export const CRM_DEFAULT_NAMES: Readonly<Record<string, string>> = { teacher_new_student: 'teacher_lesson_v2' };

/** The old script's report templates: the PDF goes as a document, then one of these by the lesson's kind. */
export const CRM_REPORT_TEMPLATES = { trial: 'report_trial_session', regular: 'report_session' } as const;
export type CrmReportKind = keyof typeof CRM_REPORT_TEMPLATES;

/** The registry fields the crm driver reads (message_templates.crm_name / crm_language, migration 680). */
export interface CrmNamed {
  key: string;
  meta_name: string;
  language: string;
  crm_name?: string | null;
  crm_language?: string | null;
}

/** The name the CRM resolves: the admin's crm_name, else the old script's name, else meta_name. Only on a crm line. */
export const crmTemplateName = (t: CrmNamed): string => t.crm_name || CRM_DEFAULT_NAMES[t.key] || t.meta_name;

/** The CRM template's language: the admin's crm_language, else the template's own. */
export const crmTemplateLanguage = (t: CrmNamed): string => t.crm_language || t.language;

/** A report_ready row whose CRM name is one of the old script's report templates: send PDF + that template. */
export const isCrmReportName = (name: string): boolean => Object.values<string>(CRM_REPORT_TEMPLATES).includes(name);

/**
 * messages.template_params.crm: what a producer adds for the CRM's own template (the meta driver never reads
 * it). `body` / `buttons` replace the {{n}} values and the URL-button suffixes by index; `report` picks the
 * report template by the lesson's kind.
 */
// A type, not an interface: messages.template_params is Json, which needs an index signature.
export type CrmValues = {
  body?: string[];
  buttons?: string[];
  report?: CrmReportKind;
};

export const crmValuesSchema = z.object({
  body: z.array(z.string()).optional(),
  buttons: z.array(z.string()).optional(),
  report: z.enum(['trial', 'regular']).optional(),
});

const blankNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
/** Meta's template name rules (lowercase, digits, underscores). */
const crmName = z.preprocess(blankNull, z.string().trim().regex(/^[a-z0-9_]{1,512}$/).nullable());
const crmLanguage = z.preprocess(blankNull, z.string().trim().regex(/^[a-z]{2,3}(_[A-Z]{2})?$/).nullable());

/** PUT /messaging/templates/:key/crm-name: blank = back to the default (audited, crm lines only). */
export const templateCrmNameSchema = z.object({ crm_name: crmName, crm_language: crmLanguage });
export type TemplateCrmNameInput = z.infer<typeof templateCrmNameSchema>;
