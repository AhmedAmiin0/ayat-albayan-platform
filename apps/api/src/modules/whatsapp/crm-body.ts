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

/** The template's values; an empty part is left out (a static template sends `params: {}`). */
export function crmTemplateParams(input: TemplateSend): CrmTemplateParams {
  const body = bodyValues(input.template, input.params);
  const header = documentHeader(input);
  const buttons = buttonValues(input);
  return {
    ...(body.length ? { body } : {}),
    ...(header ? { headerMediaUrl: header.link } : {}),
    ...(buttons.length ? { buttonParams: Object.fromEntries(buttons.map((b) => [String(b.index), b.value])) } : {}),
  };
}

/** type template: the template's Meta name and language (the CRM must hold the same names synced from Meta). */
export function crmTemplateBody(input: TemplateSend): CrmBody {
  const { template } = input;
  return { to: input.to, type: 'template', template: { name: template.meta_name, language: template.language, params: crmTemplateParams(input) } };
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
