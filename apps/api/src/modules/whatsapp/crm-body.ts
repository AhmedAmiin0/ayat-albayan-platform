import { crmTemplateLanguage, crmTemplateName } from '@ab/shared';
import { bodyValues, buttonValues, documentHeader } from './wa-components';
import type { MediaSend, TemplateSend } from './whatsapp.types';

// POST {crm}/messages bodies (docs/19 «crm driver»). The CRM resolves the template from its own synced list
// by name + language and builds Meta's components itself, so we pass the values only, read by the SAME
// helpers the meta driver uses (wa-components.ts): the same checks refuse the same bad sends.

/** The CRM's structured template params (its SendTimeParams). */
export interface CrmTemplateParams {
  body?: string[];
  /** A document / image header's link: the 7-day signed Storage URL. */
  headerMediaUrl?: string;
  /** A URL button's {{1}} suffix or a quick-reply payload, by the button's index in the template. */
  buttonParams?: Record<string, string>;
}

export type CrmBody =
  | { to: string; type: 'text'; text: string }
  | { to: string; type: 'template'; template: { name: string; language: string; params: CrmTemplateParams } }
  | { to: string; type: 'image' | 'document'; media_url: string; filename?: string; text?: string };

/** URL-button suffixes / payloads by index: the producer's CRM values (params.crm.buttons), else the meta driver's. */
function crmButtons(input: TemplateSend): [string, string][] {
  const own = input.params.crm?.buttons;
  if (own) return own.map((value, i) => [String(i), value]);
  return buttonValues(input).map((b) => [String(b.index), b.value]);
}

/**
 * The template's values; an empty part is left out (a static template sends `params: {}`). A producer that
 * knows the CRM's own template (params.crm, e.g. teacher_lesson_v2) gives its body values and buttons; the
 * meta driver's checks still run on the meta values, so a row a Meta line would refuse is refused here too.
 */
export function crmTemplateParams(input: TemplateSend): CrmTemplateParams {
  const meta = bodyValues(input.template, input.params);
  const body = input.params.crm?.body ?? meta;
  const header = documentHeader(input);
  const buttons = crmButtons(input);
  return {
    ...(body.length ? { body } : {}),
    ...(header ? { headerMediaUrl: header.link } : {}),
    ...(buttons.length ? { buttonParams: Object.fromEntries(buttons) } : {}),
  };
}

/**
 * type template: the CRM's name and language for it (crm_name / crm_language, else the old script's name,
 * else meta_name / language: crmTemplateName). The CRM resolves it from its own synced list.
 */
export function crmTemplateBody(input: TemplateSend): CrmBody {
  const { template } = input;
  const name = crmTemplateName(template);
  return { to: input.to, type: 'template', template: { name, language: crmTemplateLanguage(template), params: crmTemplateParams(input) } };
}

/** type text. A reply-to is not sent: the CRM wants its own message uuid, not a wamid. */
export function crmTextBody(input: { to: string; text: string }): CrmBody {
  return { to: input.to, type: 'text', text: input.text };
}

/** type image / document by link; `text` is the caption, a filename is a document's only. */
export function crmMediaBody(input: MediaSend): CrmBody {
  const type = input.kind ?? 'document';
  return {
    to: input.to,
    type,
    media_url: input.url,
    ...(type === 'document' && input.filename ? { filename: input.filename } : {}),
    ...(input.caption ? { text: input.caption } : {}),
  };
}
