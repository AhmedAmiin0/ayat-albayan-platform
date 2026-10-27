import { BODY_SLOTS, type TemplateParams } from '@ab/shared';
import { bodyExamples } from '../template-review';
import { authSubmitComponents } from '../direct/auth-template';
import { templateButtons } from './wa-json';
import { WaError, type MediaSend, type TemplateRow, type TemplateSend } from '../whatsapp.types';

// Graph request bodies (docs/12 §3.2): what POST /{phone}/messages and POST /message_templates get.

export type GraphBody = Record<string, unknown>;

/** Meta wants the international digits without the +. */
export const waTo = (e164: string): string => e164.replace(/\D/g, '');

/** A send we refuse before Meta does: counts as Meta's 132000 (bad parameters), never retried. */
export const badParams = (details: string) => new WaError('template parameters do not match', { code: 132000, status: 0, details });

/** Highest {{n}} in the body: Meta's own text after the health check, else the seeded shape. */
export function bodyVarCount(body: string): number {
  return Math.max(0, ...[...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])));
}

/** The body's {{1}}…{{n}} values in order, each required (shared by the meta and crm drivers). */
export function bodyValues(row: TemplateRow, params: TemplateParams): string[] {
  return Array.from({ length: bodyVarCount(row.body_ar) }, (_, i) => {
    const key = BODY_SLOTS[i];
    const text = key ? params[key]?.trim() : undefined;
    if (!text) throw badParams(`${row.key}: {{${i + 1}}} is empty`);
    return text;
  });
}

/** A document header's link and filename (the signed Storage URL); null for a template without one. */
export function documentHeader(input: TemplateSend): { link: string; filename: string } | null {
  if (input.template.header_format !== 'document') return null;
  const doc = input.params.document;
  if (!doc || !input.documentUrl) throw badParams(`${input.template.key}: the document is missing`);
  return { link: input.documentUrl, filename: doc.filename };
}

/** One send-time button value: a URL suffix ({{1}}) or a quick-reply payload, by the button's index. */
interface ButtonValue {
  index: number;
  kind: 'url' | 'quick_reply';
  value: string;
}

/** The buttons that need a value at send time (a fixed link and an unset payload need none). */
export function buttonValues(input: TemplateSend): ButtonValue[] {
  const payloads = input.payloads ?? input.params.payloads ?? [];
  return templateButtons(input.template.buttons).flatMap((b, index): ButtonValue[] => {
    if (b.type === 'url') {
      if (!b.url.includes('{{1}}')) return [];
      if (!input.params.button) throw badParams(`${input.template.key}: the link button has no value`);
      return [{ index, kind: 'url', value: input.params.button }];
    }
    const payload = payloads[index];
    return payload ? [{ index, kind: 'quick_reply', value: payload }] : [];
  });
}

function buttonComponents(input: TemplateSend): GraphBody[] {
  return buttonValues(input).map(({ index, kind, value }) => ({
    type: 'button',
    sub_type: kind,
    index: String(index),
    parameters: [kind === 'url' ? { type: 'text', text: value } : { type: 'payload', payload: value }],
  }));
}

/** The template's components in Meta's order: header, body, buttons by index. */
function templateComponents(input: TemplateSend): GraphBody[] {
  const parameters = bodyValues(input.template, input.params).map((text) => ({ type: 'text', text }));
  const doc = documentHeader(input);
  const header = doc ? { type: 'header', parameters: [{ type: 'document', document: doc }] } : null;
  return [
    ...(header ? [header] : []),
    ...(parameters.length ? [{ type: 'body', parameters }] : []),
    ...buttonComponents(input),
  ];
}

const envelope = (to: string) => ({ messaging_product: 'whatsapp', recipient_type: 'individual', to: waTo(to) });

export function templateMessage(input: TemplateSend): GraphBody {
  const { template } = input;
  return {
    ...envelope(input.to),
    type: 'template',
    template: { name: template.meta_name, language: { code: template.language }, components: templateComponents(input) },
  };
}

export function textMessage(input: { to: string; text: string; replyTo?: string | null }): GraphBody {
  return {
    ...envelope(input.to),
    type: 'text',
    text: { body: input.text, preview_url: true },
    ...(input.replyTo ? { context: { message_id: input.replyTo } } : {}),
  };
}

/**
 * A session file by link (`{type: kind, [kind]: {link, caption?, filename?}}`); a filename is a
 * document's only, Meta takes no caption on an audio, and `voice: true` only on an audio (an ogg/opus
 * voice note, owner 2026-10-27). A reply carries the quoted wamid as context.
 */
export function mediaMessage(input: MediaSend): GraphBody {
  const kind = input.kind ?? 'document';
  const filename = kind === 'document' && input.filename ? { filename: input.filename } : {};
  const caption = kind !== 'audio' && input.caption ? { caption: input.caption } : {};
  const voice = kind === 'audio' && input.voice ? { voice: true } : {};
  const context = input.replyTo ? { context: { message_id: input.replyTo } } : {};
  return { ...envelope(input.to), type: kind, [kind]: { link: input.url, ...caption, ...filename, ...voice }, ...context };
}

export const readReceipt = (waMessageId: string): GraphBody => ({
  messaging_product: 'whatsapp',
  status: 'read',
  message_id: waMessageId,
});

/**
 * POST /{waba}/message_templates (docs/12 §3.4): a DOCUMENT HEADER with the uploaded sample's
 * handle, BODY with a sample value for every {{n}} (Meta requires them), FOOTER, BUTTONS.
 */
export function submitPayload(row: TemplateRow, headerHandle?: string): GraphBody {
  if (row.category === 'authentication') return { name: row.meta_name, language: row.language, category: 'AUTHENTICATION', components: authSubmitComponents(row) };
  const examples = bodyExamples(row);
  const components: GraphBody[] = [];
  if (row.header_format === 'document') {
    if (!headerHandle) throw new WaError('a document header needs a sample upload handle', { code: null, status: 0 });
    components.push({ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [headerHandle] } });
  }
  components.push({ type: 'BODY', text: row.body_ar, ...(examples.length ? { example: { body_text: [examples] } } : {}) });
  if (row.footer_ar) components.push({ type: 'FOOTER', text: row.footer_ar });
  const buttons = templateButtons(row.buttons).map((b) =>
    b.type === 'url'
      ? { type: 'URL', text: b.text ?? '', url: b.url, ...(b.url.includes('{{1}}') ? { example: [b.url.replace('{{1}}', 'sample')] } : {}) }
      : { type: 'QUICK_REPLY', text: b.text },
  );
  if (buttons.length) components.push({ type: 'BUTTONS', buttons });
  return { name: row.meta_name, language: row.language, category: row.category.toUpperCase(), components };
}
