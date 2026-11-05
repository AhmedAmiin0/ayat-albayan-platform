import type { CrmBody, CrmTemplateParams } from '@/modules/messaging/whatsapp/drivers/crm/crm-body';
import {
  envelope,
  mediaMessage,
  textMessage,
  type GraphBody,
} from '@/modules/messaging/whatsapp/messages/wa-components';
import type { TemplateSend } from '@/modules/messaging/whatsapp/whatsapp.types';
import { wabaTemplate, type WabaButton, type WabaTemplate } from './waba-template';

// The meta driver's side of the one resolution (docs/19 «CRM → Meta»): a WabaTemplate as Graph's
// POST /{phone}/messages body, and a body in the CRM's shape (the Apps Script's, through the script
// relay) as the same Graph body. Pure.

function buttonComponent({ index, kind, value }: WabaButton): GraphBody {
  const parameter = kind === 'url' ? { type: 'text', text: value } : { type: 'payload', payload: value };
  return { type: 'button', sub_type: kind, index: String(index), parameters: [parameter] };
}

/** The template's components in Meta's order: header, body, buttons by index. */
function components(t: WabaTemplate): GraphBody[] {
  const header = t.header ? [{ type: 'header', parameters: [{ type: 'document', document: t.header }] }] : [];
  const parameters = t.body.map((text) => ({ type: 'text', text }));
  const body = parameters.length ? [{ type: 'body', parameters }] : [];
  return [...header, ...body, ...t.buttons.map(buttonComponent)];
}

/** One WABA template to `to` (E.164). */
export function graphTemplate(to: string, t: WabaTemplate): GraphBody {
  return {
    ...envelope(to),
    type: 'template',
    template: { name: t.name, language: { code: t.language }, components: components(t) },
  };
}

/** A registry row's send: its WABA name, language and values (waba-template.ts). */
export const templateMessage = (input: TemplateSend): GraphBody =>
  graphTemplate(input.to, wabaTemplate(input));

/**
 * The script's template params: body values, an optional document header link, and buttonParams
 * by index. The script only fills URL buttons' {{1}} (booking and reminder links), so each value
 * goes as a URL suffix.
 */
function relayTemplate(name: string, language: string, p: CrmTemplateParams): WabaTemplate {
  const buttons = Object.entries(p.buttonParams ?? {}).map(
    ([index, value]): WabaButton => ({ index: Number(index), kind: 'url', value }),
  );
  const header = p.headerMediaUrl ? { link: p.headerMediaUrl } : null;
  return { name, language, body: p.body ?? [], header, buttons };
}

/** A body in the CRM's shape as Graph's: the template as is, text, or a file by link. */
export function relayGraphBody(body: CrmBody): GraphBody {
  if (body.type === 'template') {
    const { name, language, params } = body.template;
    return graphTemplate(body.to, relayTemplate(name, language, params));
  }
  if (body.type === 'text') return textMessage(body);
  const filename = body.filename ? { filename: body.filename } : {};
  const caption = body.text ?? null;
  return mediaMessage({ to: body.to, kind: body.type, url: body.media_url, caption, ...filename });
}
