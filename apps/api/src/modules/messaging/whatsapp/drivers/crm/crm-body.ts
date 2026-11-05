import { wabaTemplate, type WabaTemplate } from '@/modules/messaging/whatsapp/drivers/waba/waba-template';
import type { MediaSend, TemplateSend } from '@/modules/messaging/whatsapp/whatsapp.types';

// POST {crm}/messages bodies (docs/19 «crm driver»). The CRM resolves the template from its own synced list
// by name + language and builds Meta's components itself, so we pass the values only: the SAME
// WabaTemplate the meta driver sends (waba-template.ts), so the same checks refuse the same bad sends.

/** The CRM's structured template params (its SendTimeParams). */
export interface CrmTemplateParams {
  body?: string[];
  /** A document / image header's link: the 7-day signed Storage URL. */
  headerMediaUrl?: string;
  /** A URL button's {{1}} suffix or a quick-reply payload, by the button's index in the template. */
  buttonParams?: Record<string, string>;
}

/** `name`: the contact's display name for the CRM (only the script relay sends one). */
export type CrmBody = (
  | { to: string; type: 'text'; text: string }
  | { to: string; type: 'template'; template: { name: string; language: string; params: CrmTemplateParams } }
  | { to: string; type: 'image' | 'document'; media_url: string; filename?: string; text?: string }
) & { name?: string };

/**
 * type template: the row's WABA template (waba-template.ts, the one resolution both drivers send) in
 * the CRM's params; an empty part is left out (a static template sends `params: {}`). The CRM
 * resolves the template from its own synced list by name + language and builds Meta's components.
 */
export function crmTemplateBody(input: TemplateSend): CrmBody {
  return { to: input.to, type: 'template', template: crmTemplate(wabaTemplate(input)) };
}

/** A WabaTemplate as the CRM's template part: URL suffixes and payloads by button index. */
export function crmTemplate(t: WabaTemplate): Extract<CrmBody, { type: 'template' }>['template'] {
  const buttons = t.buttons.map((b): [string, string] => [String(b.index), b.value]);
  const params: CrmTemplateParams = {
    ...(t.body.length ? { body: t.body } : {}),
    ...(t.header ? { headerMediaUrl: t.header.link } : {}),
    ...(buttons.length ? { buttonParams: Object.fromEntries(buttons) } : {}),
  };
  return { name: t.name, language: t.language, params };
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
