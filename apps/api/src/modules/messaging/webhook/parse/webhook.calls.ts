import type {
  CallPermissionReplyEvent,
  CallWebhookEvent,
  WebhookBatch,
} from '@/modules/messaging/webhook/webhook.events';
import { field, get, list, metaTime } from './webhook.fields';

// A `calls` change (Meta Cloud API Calling, forwarded raw by Kapso's meta-kind webhook) → flat call
// events (docs/28 §2). Lenient like the message parser: an item without a call id is skipped.

interface CallsContext {
  now: Date;
  phoneNumberId: string | null;
  out: CallWebhookEvent[];
}

const upper = (v: string | null): string | null => (v ? v.toUpperCase() : null);

function duration(c: unknown): number | null {
  const n = Number(get(c, 'duration'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

type Read = (path: string) => string | null;

/**
 * A missing direction with our callback ref is our own call (only outbound calls carry
 * biz_opaque_callback_data).
 */
function isInboundCall(f: Read): boolean {
  const direction = upper(f('direction'));
  return direction === null
    ? f('biz_opaque_callback_data') === null
    : direction !== 'BUSINESS_INITIATED';
}

function toCall(c: unknown, ctx: CallsContext): CallWebhookEvent | null {
  const f = (path: string) => field(c, path);
  const [id, event] = [f('id'), f('event')];
  if (!id || (event !== 'connect' && event !== 'terminate')) return null;
  const inbound = isInboundCall(f);
  return {
    kind: event,
    waCallId: id,
    phoneNumberId: ctx.phoneNumberId,
    direction: inbound ? 'inbound' : 'outbound',
    peer: inbound ? f('from') : f('to'),
    sdp: f('session.sdp'),
    ref: f('biz_opaque_callback_data'),
    status: upper(f('status')),
    duration: duration(c),
    at: metaTime(f('timestamp'), ctx.now),
  };
}

function toCallStatus(s: unknown, ctx: CallsContext): CallWebhookEvent | null {
  const f = (path: string) => field(s, path);
  const id = f('id');
  // A message status never arrives in a `calls` change; skip anything not typed as a call anyway.
  if (!id || (f('type') !== null && f('type') !== 'call')) return null;
  return {
    ...{ kind: 'status', waCallId: id, phoneNumberId: ctx.phoneNumberId, direction: 'outbound' },
    ...{ peer: f('recipient_id'), sdp: null, ref: f('biz_opaque_callback_data'), status: upper(f('status')), duration: null },
    at: metaTime(f('timestamp'), ctx.now),
  };
}

/** The calls and call statuses of one `calls` change's value. */
export function readCalls(value: unknown, ctx: CallsContext): void {
  for (const c of list(get(value, 'calls'))) {
    const event = toCall(c, ctx);
    if (event) ctx.out.push(event);
  }
  for (const s of list(get(value, 'statuses'))) {
    const event = toCallStatus(s, ctx);
    if (event) ctx.out.push(event);
  }
}

type PermissionResponse = CallPermissionReplyEvent['response'];

const RESPONSES = new Map<string, PermissionResponse>([
  ['accept', 'accepted'],
  ['reject', 'rejected'],
]);

/** WhatsApp's expiry counts only for an accepted request. */
const expiry = (response: PermissionResponse, exp: string | null, now: Date): Date | null =>
  response === 'accepted' && exp ? metaTime(exp, now) : null;

function toPermissionReply(
  m: unknown,
  ctx: { now: Date; phoneNumberId: string },
): CallPermissionReplyEvent | null {
  const f = (path: string) => field(m, path);
  const from = f('from');
  const response = RESPONSES.get(f('interactive.call_permission_reply.response') ?? '');
  if (f('interactive.type') !== 'call_permission_reply' || !from || !response) return null;
  const exp = f('interactive.call_permission_reply.expiration_timestamp');
  return {
    phoneNumberId: ctx.phoneNumberId,
    from,
    response,
    expiresAt: expiry(response, exp, ctx.now),
    at: metaTime(f('timestamp'), ctx.now),
  };
}

/**
 * A `messages` change's call_permission_reply items (docs/28 §10): the family's accept / reject of
 * a request, with WhatsApp's expiry. The message itself is still stored as an inbound row (its
 * thread).
 */
export function readPermissionReplies(
  value: unknown,
  ctx: { now: Date; phoneNumberId: string; batch: WebhookBatch },
): void {
  for (const m of list(get(value, 'messages'))) {
    const reply = toPermissionReply(m, ctx);
    if (reply) (ctx.batch.permissions ??= []).push(reply);
  }
}
