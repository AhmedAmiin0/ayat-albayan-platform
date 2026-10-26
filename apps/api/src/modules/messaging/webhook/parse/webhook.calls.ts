import type { CallWebhookEvent } from '../webhook.events';
import { field, get, metaTime } from './webhook.parse';

// A `calls` change (Meta Cloud API Calling, forwarded raw by Kapso's meta-kind webhook) → flat call
// events (docs/28 §2). Lenient like the message parser: an item without a call id is skipped.

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

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

function toCall(c: unknown, ctx: CallsContext): CallWebhookEvent | null {
  const f = (path: string) => field(c, path);
  const [id, event] = [f('id'), f('event')];
  if (!id || (event !== 'connect' && event !== 'terminate')) return null;
  // A missing direction with our callback ref is our own call (only outbound calls carry biz_opaque_callback_data).
  const direction = upper(f('direction'));
  const inbound = direction === null ? f('biz_opaque_callback_data') === null : direction !== 'BUSINESS_INITIATED';
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
