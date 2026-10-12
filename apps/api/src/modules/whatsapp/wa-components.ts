import { BODY_SLOTS, type TemplateParams } from '@ab/shared';
import { bodyExamples } from './template-review';
import { templateButtons } from './wa-json';
import { WaError, type TemplateRow, type TemplateSend } from './whatsapp.types';

// Graph request bodies (docs/12 §3.2): what POST /{phone}/messages and POST /message_templates get.

export type GraphBody = Record<string, unknown>;

/** Meta wants the international digits without the +. */
export const waTo = (e164: string): string => e164.replace(/\D/g, '');

/** A send we refuse before Meta does: counts as Meta's 132000 (bad parameters), never retried. */
const badParams = (details: string) => new WaError('template parameters do not match', { code: 132000, status: 0, details });

/** Highest {{n}} in the body: Meta's own text after the health check, else the seeded shape. */
export function bodyVarCount(body: string): number {
  return Math.max(0, ...[...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])));
}

function bodyParameters(row: TemplateRow, params: TemplateParams) {
  return Array.from({ length: bodyVarCount(row.body_ar) }, (_, i) => {
    const key = BODY_SLOTS[i];
    const text = key ? params[key]?.trim() : undefined;
    if (!text) throw badParams(`${row.key}: {{${i + 1}}} is empty`);
    return { type: 'text', text };
  });
}

function headerComponent(input: TemplateSend): GraphBody | null {
  if (input.template.header_format !== 'document') return null;
  const doc = input.params.document;
  if (!doc || !input.documentUrl) throw badParams(`${input.template.key}: the document is missing`);
  return { type: 'header', parameters: [{ type: 'document', document: { link: input.documentUrl, filename: doc.filename } }] };
}

function buttonComponents(input: TemplateSend): GraphBody[] {
  const payloads = input.payloads ?? input.params.payloads ?? [];
  return templateButtons(input.template.buttons).flatMap((b, i): GraphBody[] => {
    const index = String(i);
    if (b.type === 'url') {
      if (!b.url.includes('{{1}}')) return []; // a fixed link has nothing to fill
      if (!input.params.button) throw badParams(`${input.template.key}: the link button has no value`);
      return [{ type: 'button', sub_type: 'url', index, parameters: [{ type: 'text', text: input.params.button }] }];
    }
    const payload = payloads[i];
    return payload ? [{ type: 'button', sub_type: 'quick_reply', index, parameters: [{ type: 'payload', payload }] }] : [];
  });
}

/** The template's components in Meta's order: header, body, buttons by index. */
export function templateComponents(input: TemplateSend): GraphBody[] {
  const parameters = bodyParameters(input.template, input.params);
  const header = headerComponent(input);
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

export function documentMessage(input: { to: string; url: string; filename: string; caption?: string | null }): GraphBody {
  const document = { link: input.url, filename: input.filename, ...(input.caption ? { caption: input.caption } : {}) };
  return { ...envelope(input.to), type: 'document', document };
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
