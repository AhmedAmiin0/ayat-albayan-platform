import { BODY_SLOTS, type TemplateParams, type WaSendKind } from '@ab/shared';
import { WA_ERROR } from '@ab/catalog';
import { templateButtons } from './wa-json';
import { WaError, type MediaSend, type TemplateRow, type TemplateSend } from '@/modules/messaging/whatsapp/whatsapp.types';

// Graph request bodies (docs/12 §3.2): what POST /{phone}/messages and POST /message_templates get.

export type GraphBody = Record<string, unknown>;

/** Meta wants the international digits without the +. */
export const waTo = (e164: string): string => e164.replace(/\D/g, '');

/** A send we refuse before Meta does: counts as Meta's 132000 (bad parameters), never retried. */
export const badParams = (details: string) => new WaError('template parameters do not match', { code: WA_ERROR.paramCountMismatch, status: 0, details });

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

/**
 * A document header's link and filename (the signed Storage URL); null for a template without one.
 */
export function documentHeader(input: TemplateSend): { link: string; filename: string } | null {
  if (input.template.header_format !== 'document') return null;
  const doc = input.params.document;
  if (!doc || !input.documentUrl) throw badParams(`${input.template.key}: the document is missing`);
  return { link: input.documentUrl, filename: doc.filename };
}

/**
 * One send-time button value: a URL suffix ({{1}}) or a quick-reply payload, by the button's index.
 */
interface ButtonValue {
  index: number;
  kind: 'url' | 'quick_reply';
  value: string;
}

/** The buttons that need a value at send time (a fixed link and an unset payload need none). */
export function buttonValues(input: TemplateSend): ButtonValue[] {
  const payloads = input.payloads ?? input.params.payloads ?? [];
  const buttons = templateButtons(input.template.buttons);
  return buttons.flatMap((b, index): ButtonValue[] => {
    const nth = urlOrder(buttons, index);
    if (b.type === 'url') return urlValue(input, { url: b.url, index, nth });
    const payload = payloads[index];
    return payload ? [{ index, kind: 'quick_reply', value: payload }] : [];
  });
}

/** How many URL buttons come before this one: its place in params.buttons. */
const urlOrder = (buttons: readonly { type: string }[], index: number): number =>
  buttons.slice(0, index).filter((b) => b.type === 'url').length;

/** A URL button's suffix: params.buttons by URL order, else the one params.button. */
interface UrlAt {
  url: string;
  index: number;
  nth: number;
}
function urlValue(input: TemplateSend, b: UrlAt): ButtonValue[] {
  if (!b.url.includes('{{1}}')) return [];
  const value = input.params.buttons?.[b.nth] ?? input.params.button;
  if (!value) throw badParams(`${input.template.key}: the link button has no value`);
  return [{ index: b.index, kind: 'url', value }];
}

/** Meta's recipient envelope of every message (template, text, file, reaction). */
export const envelope = (to: string) => ({ messaging_product: 'whatsapp', recipient_type: 'individual', to: waTo(to) });

export function textMessage(input: {
  to: string;
  text: string;
  replyTo?: string | null;
}): GraphBody {
  return {
    ...envelope(input.to),
    type: 'text',
    text: { body: input.text, preview_url: true },
    ...replyContext(input.replyTo),
  };
}

/** A reply carries the quoted wamid as context. */
const replyContext = (replyTo: string | null | undefined): GraphBody =>
  replyTo ? { context: { message_id: replyTo } } : {};

/** Meta takes a filename on a document only. */
const fileName = (kind: WaSendKind, filename: string | undefined): GraphBody =>
  kind === 'document' && filename ? { filename } : {};

/** Meta takes no caption on an audio. */
const captionOf = (kind: WaSendKind, caption: string | null | undefined): GraphBody =>
  kind !== 'audio' && caption ? { caption } : {};

/** `voice: true` only on an audio (an ogg/opus voice note). */
const voiceOf = (kind: WaSendKind, voice: boolean | undefined): GraphBody =>
  kind === 'audio' && voice ? { voice: true } : {};

/** A session file by link: `{type: kind, [kind]: {link, caption?, filename?, voice?}}`. */
export function mediaMessage(input: MediaSend): GraphBody {
  const kind = input.kind ?? 'document';
  const caption = captionOf(kind, input.caption);
  const filename = fileName(kind, input.filename);
  return {
    ...envelope(input.to),
    type: kind,
    [kind]: { link: input.url, ...caption, ...filename, ...voiceOf(kind, input.voice) },
    ...replyContext(input.replyTo),
  };
}

export const readReceipt = (waMessageId: string): GraphBody => ({
  messaging_product: 'whatsapp',
  status: 'read',
  message_id: waMessageId,
});
