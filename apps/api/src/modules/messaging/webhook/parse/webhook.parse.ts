import type { Json } from '@ab/db';
import {
  DELIVERY_STATUSES,
  MEDIA_TYPES,
  type DeliveryStatus,
  type InboundEvent,
  type StatusEvent,
  type WebhookBatch,
} from '../webhook.events';
import { readCalls, readPermissionReplies } from './webhook.calls';
import { receiving, where, type ReceiveOptions, type Receiving } from '../lines/webhook.lines';
import { ECHO_FIELD, readEchoes } from './webhook.echoes';

// Meta's webhook envelope → flat inbound messages and delivery statuses (docs/12 §3.5). Fields
// are read by their Meta path («interactive.button_reply.id»). Lenient: an item we can't read is
// skipped, never a 500 (Meta would retry it forever).

/** The value at a dotted path («errors.0.code») of parsed JSON; undefined when absent. */
export function get(value: unknown, path: string): unknown {
  let at: unknown = value;
  for (const key of path.split('.')) {
    at = at !== null && typeof at === 'object' ? (at as Record<string, unknown>)[key] : undefined;
  }
  return at;
}

/** A string (or number, as text) at a dotted path; null otherwise. */
export function field(value: unknown, path: string): string | null {
  const at = get(value, path);
  if (typeof at === 'number') return String(at);
  return typeof at === 'string' ? at : null;
}

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const first = (...values: (string | null)[]): string | null => values.find((v) => v !== null) ?? null;

/** Unix-seconds string → Date; a missing or bad timestamp is "now". */
export function metaTime(ts: string | null | undefined, now: Date): Date {
  const n = Number(ts);
  return ts && Number.isFinite(n) && n > 0 ? new Date(n * 1000) : now;
}

/** The type-specific part as Meta sent it (+ errors of an «unsupported» message); null for text. */
function payloadOf(m: unknown, type: string): Json | null {
  if (type === 'text') return null;
  const errors = get(m, 'errors');
  return { type, [type]: get(m, type) ?? null, ...(errors === undefined ? {} : { errors }) } as Json;
}

interface MessageContext {
  names: Map<string, string>;
  now: Date;
  at: Receiving;
}

/** One Meta message object → an InboundEvent (also Kapso's inbound history, external/inbound). */
export function toInbound(m: unknown, ctx: MessageContext): InboundEvent | null {
  const [from, id, type] = [field(m, 'from'), field(m, 'id'), field(m, 'type')];
  if (!from || !id || !type) return null;
  const f = (path: string) => field(m, path);
  const media = (MEDIA_TYPES as readonly string[]).includes(type) ? type : null;
  const mf = (key: string) => (media ? f(`${media}.${key}`) : null);
  return {
    waMessageId: id,
    from,
    name: ctx.names.get(from) || null,
    at: metaTime(f('timestamp'), ctx.now),
    type,
    body: first(f('text.body'), mf('caption'), f('button.text'), f('interactive.button_reply.title'), f('interactive.list_reply.title')),
    replyKey: first(f('button.payload'), f('interactive.button_reply.id'), f('interactive.list_reply.id')),
    replyTo: f('context.id'),
    mediaId: mf('id'),
    mediaMime: mf('mime_type'),
    payload: payloadOf(m, type),
    ...where(ctx.at),
  };
}

function toStatus(s: unknown, ctx: Omit<MessageContext, 'names'>): StatusEvent | null {
  const [id, status] = [field(s, 'id'), field(s, 'status')];
  if (!id || !(DELIVERY_STATUSES as readonly (string | null)[]).includes(status)) return null;
  const f = (path: string) => field(s, path);
  return {
    waMessageId: id,
    status: status as DeliveryStatus,
    at: metaTime(f('timestamp'), ctx.now),
    errorCode: f('errors.0.code'),
    errorText: first(f('errors.0.title'), f('errors.0.message')),
    conversationId: f('conversation.id'),
    pricingCategory: f('pricing.category'),
    ...where(ctx.at),
  };
}

export interface ParseOptions extends ReceiveOptions {
  now: Date;
}

/** `messages` → the batch; `smb_message_echoes` → echoes; `calls` → batch.calls (docs/28, never ticks); else skipped. */
function readChange(change: unknown, ctx: ParseOptions & { batch: WebhookBatch }): void {
  const kind = field(change, 'field');
  if (kind !== 'messages' && kind !== ECHO_FIELD && kind !== 'calls') return;
  const value = get(change, 'value');
  const number = field(value, 'metadata.phone_number_id') ?? undefined;
  const at = receiving(number, ctx);
  if (!at) return;
  if (kind === 'calls') return readCalls(value, { now: ctx.now, phoneNumberId: number ?? null, out: (ctx.batch.calls ??= []) });
  if (kind === ECHO_FIELD) return void ctx.batch.echoes.push(...readEchoes(value, at));
  readMessages(value, { ...ctx, at });
}

/** A `messages` change's inbound messages and delivery statuses. */
function readMessages(value: unknown, ctx: ParseOptions & { batch: WebhookBatch; at: Receiving }): void {
  const contacts = list(get(value, 'contacts'));
  const names = new Map(contacts.map((c) => [field(c, 'wa_id') ?? '', field(c, 'profile.name')?.trim() ?? '']));
  for (const m of list(get(value, 'messages'))) {
    const event = toInbound(m, { names, now: ctx.now, at: ctx.at });
    if (event) ctx.batch.messages.push(event);
  }
  for (const s of list(get(value, 'statuses'))) {
    const event = toStatus(s, { now: ctx.now, at: ctx.at });
    if (event) ctx.batch.statuses.push(event);
  }
  if (ctx.at.phoneNumberId) readPermissionReplies(value, { now: ctx.now, phoneNumberId: ctx.at.phoneNumberId, batch: ctx.batch });
}

export function parseWebhook(body: unknown, opts: ParseOptions): WebhookBatch {
  const batch: WebhookBatch = { messages: [], statuses: [], echoes: [] };
  for (const entry of list(get(body, 'entry'))) {
    for (const change of list(get(entry, 'changes'))) readChange(change, { ...opts, batch });
  }
  return batch;
}
