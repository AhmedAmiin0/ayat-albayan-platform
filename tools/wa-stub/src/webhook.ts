// Signed Meta webhooks the stub sends to the API (docs/12 §5): inbound messages and statuses.
import { createHmac } from 'node:crypto';
import type { Json } from './meta.ts';

export interface WebhookTarget {
  url: string;
  appSecret: string;
  phoneNumberId: string;
  /** metadata.display_phone_number (default the notifications line's). */
  displayPhone?: string;
  /** entry[0].id (default the notifications line's 'stub-waba'). */
  entryId?: string;
}

/** X-Hub-Signature-256: HMAC-SHA256 of the exact body bytes with the app secret. */
export function sign(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

function envelope(target: WebhookTarget, value: Json): string {
  const metadata = { display_phone_number: target.displayPhone ?? '15550001111', phone_number_id: target.phoneNumberId };
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: target.entryId ?? 'stub-waba', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata, ...value } }] }],
  });
}

/** POSTs one signed change to the API webhook; returns the API's HTTP status. */
export async function forward(target: WebhookTarget, value: Json): Promise<number> {
  const body = envelope(target, value);
  const res = await fetch(target.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': sign(body, target.appSecret) },
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

function messagePart(spec: InboundSpec, mediaId: string | null): Json {
  if (spec.button) return { type: 'button', button: spec.button };
  if (spec.interactive) {
    return { type: 'interactive', interactive: { type: 'button_reply', button_reply: spec.interactive } };
  }
  if (spec.media && mediaId) {
    const { kind, mime, caption, filename } = spec.media;
    const part = { id: mediaId, mime_type: mime, sha256: 'stub', ...(caption ? { caption } : {}), ...(filename ? { filename } : {}) };
    return { type: kind, [kind]: part };
  }
  return { type: 'text', text: { body: spec.text ?? '' } };
}

export function inboundValue(spec: InboundSpec, ids: { message: string; media: string | null }): Json {
  const message: Json = {
    from: spec.from,
    id: ids.message,
    timestamp: String(spec.timestamp ?? Math.floor(Date.now() / 1000)),
    ...(spec.context ? { context: { from: '15550001111', id: spec.context } } : {}),
    ...messagePart(spec, ids.media),
  };
  return { contacts: [{ wa_id: spec.from, profile: { name: spec.name ?? '' } }], messages: [message] };
}

/** POST /__stub/status body: a delivery status for a message the stub accepted. */
export interface StatusSpec {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorCode?: number;
  errorTitle?: string;
  timestamp?: number;
}

export function statusValue(spec: StatusSpec, recipient: string): Json {
  const s: Json = {
    id: spec.id,
    status: spec.status,
    timestamp: String(spec.timestamp ?? Math.floor(Date.now() / 1000)),
    recipient_id: recipient,
  };
  if (spec.status === 'sent' || spec.status === 'delivered') {
    s['conversation'] = { id: `conv-${recipient}`, origin: { type: 'utility' } };
    s['pricing'] = { billable: true, pricing_model: 'PMP', category: 'utility' };
  }
  if (spec.status === 'failed') {
    s['errors'] = [{ code: spec.errorCode ?? 131026, title: spec.errorTitle ?? 'Message undeliverable' }];
  }
  return { statuses: [s] };
}
