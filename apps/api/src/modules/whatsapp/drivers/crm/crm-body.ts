import { CRM_DEFAULT_NAMES, crmTemplateLanguage, crmTemplateName } from '@ab/shared';
import { bodyValues, buttonValues, documentHeader } from '../../wa-components';
import type { MediaSend, TemplateSend } from '../../whatsapp.types';

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

/**
 * The name the CRM gets for this row: crmTemplateName, except that the old script's default (teacher_lesson_v2)
 * needs the producer's CRM values; a row without them (queued before they existed, or a value missing) keeps
 * meta_name and its Meta values, as before the mapping. An admin's crm_name is always sent as set.
 */
export function crmRowName(input: TemplateSend): string {
  const { template } = input;
  const name = crmTemplateName(template);
  const byDefault = !template.crm_name && name === CRM_DEFAULT_NAMES[template.key];
  return byDefault && !input.params.crm?.body ? template.meta_name : name;
}

/**
 * The producer's CRM values (params.crm) fit only the CRM's OWN template (e.g. teacher_lesson_v2): when the name
 * the CRM gets is the Meta name (an admin's crm_name pointing at the CRM's copy of the Meta template, or the
 * fallback above), the Meta values go, or a 3-variable template would get 5 values.
 */
const ownCrm = (input: TemplateSend) => (crmRowName(input) === input.template.meta_name ? undefined : input.params.crm);

/** URL-button suffixes / payloads by index: the producer's CRM values (params.crm.buttons), else the meta driver's. */
function crmButtons(input: TemplateSend): [string, string][] {
  const own = ownCrm(input)?.buttons;
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
  const body = ownCrm(input)?.body ?? meta;
  const header = documentHeader(input);
  const buttons = crmButtons(input);
  return {
    ...(body.length ? { body } : {}),
    ...(header ? { headerMediaUrl: header.link } : {}),
    ...(buttons.length ? { buttonParams: Object.fromEntries(buttons) } : {}),
  };
}

/** type template: the CRM's name for this row (crmRowName) and language (crm_language, else language). */
export function crmTemplateBody(input: TemplateSend): CrmBody {
  const language = crmTemplateLanguage(input.template);
  return { to: input.to, type: 'template', template: { name: crmRowName(input), language, params: crmTemplateParams(input) } };
}

/** type text. A reply-to is not sent: the CRM wants its own message uuid, not a wamid. */
export function crmTextBody(input: { to: string; text: string }): CrmBody {
  return { to: input.to, type: 'text', text: input.text };
}

/**
 * type image / document by link; `text` is the caption, a filename is a document's only. The CRM
 * takes these two only: a forwarded voice note or video goes as a document. No reply context (its uuid).
 */
export function crmMediaBody(input: MediaSend): CrmBody {
  const type = input.kind === 'image' ? 'image' : 'document';
  return {
    to: input.to,
    type,
    media_url: input.url,
    ...(type === 'document' && input.filename ? { filename: input.filename } : {}),
    ...(input.caption ? { text: input.caption } : {}),
  };
}
