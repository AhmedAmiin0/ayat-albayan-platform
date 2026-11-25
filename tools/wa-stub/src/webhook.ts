// Signed Meta webhooks the stub sends to the API (docs/12 §5): inbound messages and statuses.
import { createHmac } from 'node:crypto';
import type { Json } from './providers/meta.ts';

export interface WebhookTarget {
  url: string;
  appSecret: string;
  phoneNumberId: string;
  /** metadata.display_phone_number (default the notifications line's). */
  displayPhone?: string;
  /** entry[0].id (default the notifications line's 'stub-waba'). */
  entryId?: string;
  /** Kapso forwarding a raw Meta payload (docs/19): X-Webhook-Signature (bare hex) instead. */
  kapso?: boolean;
  /** The change's field (default `messages`; `calls` for WhatsApp Calling, docs/28). */
  field?: string;
}

/** X-Hub-Signature-256: HMAC-SHA256 of the exact body bytes with the app secret. */
export function sign(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

function envelope(target: WebhookTarget, value: Json): string {
  const metadata = {
    display_phone_number: target.displayPhone ?? '15550001111',
    phone_number_id: target.phoneNumberId,
  };
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: target.entryId ?? 'stub-waba',
        changes: [
          {
            field: target.field ?? 'messages',
            value: { messaging_product: 'whatsapp', metadata, ...value },
          },
        ],
      },
    ],
  });
}

/** X-Webhook-Signature: Kapso's lowercase hex HMAC-SHA256 of the exact body bytes, no prefix. */
export function kapsoSign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/** POSTs one signed change to the API webhook; returns the API's HTTP status. */
export async function forward(target: WebhookTarget, value: Json): Promise<number> {
  const body = envelope(target, value);
  const signature = target.kapso
    ? { 'x-webhook-signature': kapsoSign(body, target.appSecret) }
    : { 'x-hub-signature-256': sign(body, target.appSecret) };
  const res = await fetch(target.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...signature },
    body,
  });
  return res.status;
}

export type MediaKind = 'image' | 'audio' | 'video' | 'document' | 'sticker';

/** POST /__stub/inbound body. Exactly one of text / button / interactive / media (text default). */
export interface InboundSpec {
  from: string;
  name?: string;
  text?: string;
  /** Template quick-reply tap: Meta sends type «button» with the payload we set at send time. */
  button?: { text: string; payload: string };
  /** Session interactive reply button. */
  interactive?: { id: string; title: string };
  media?: { kind: MediaKind; mime: string; caption?: string; filename?: string; base64?: string };
  /** wamid this message replies to (Meta's context.id). */
  context?: string;
  /** Unix seconds; defaults to now. */
  timestamp?: number;
  /** The line it arrives on (default notifications); an unknown id is forwarded as given. */
  phoneNumberId?: string;
  /** Signs with this secret instead of the line's own (the bad-signature case). */
  signWith?: string;
}

/** The truthy fields of `fields` only (an empty caption or filename is left out). */
const present = (fields: Json): Json =>
  Object.fromEntries(Object.entries(fields).filter(([, v]) => v));

export const unixSeconds = (timestamp: number | undefined): string =>
  String(timestamp ?? Math.floor(Date.now() / 1000));

function mediaPart(media: NonNullable<InboundSpec['media']>, mediaId: string): Json {
  const { kind, mime, caption, filename } = media;
  const part = { id: mediaId, mime_type: mime, sha256: 'stub', ...present({ caption, filename }) };
  return { type: kind, [kind]: part };
}

type PartRule = (spec: InboundSpec, mediaId: string | null) => Json | null;

/** In Meta's precedence: a template button, an interactive reply, then media. */
const PART_RULES: PartRule[] = [
  (spec) => (spec.button ? { type: 'button', button: spec.button } : null),
  (spec) =>
    spec.interactive
      ? {
          type: 'interactive',
          interactive: { type: 'button_reply', button_reply: spec.interactive },
        }
      : null,
  (spec, mediaId) => (spec.media && mediaId ? mediaPart(spec.media, mediaId) : null),
];

function messagePart(spec: InboundSpec, mediaId: string | null): Json {
  const part = PART_RULES.map((rule) => rule(spec, mediaId)).find((p) => p !== null);
  return part ?? { type: 'text', text: { body: spec.text ?? '' } };
}

export function inboundValue(
  spec: InboundSpec,
  ids: { message: string; media: string | null },
): Json {
  const message: Json = {
    from: spec.from,
    id: ids.message,
    timestamp: unixSeconds(spec.timestamp),
    ...(spec.context ? { context: { from: '15550001111', id: spec.context } } : {}),
    ...messagePart(spec, ids.media),
  };
  return {
    contacts: [{ wa_id: spec.from, profile: { name: spec.name ?? '' } }],
    messages: [message],
  };
}
