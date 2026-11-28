import {
  DELIVERY_STATUSES,
  type DeliveryStatus,
  type StatusEvent,
  type WebhookBatch,
} from '@/modules/messaging/webhook/webhook.events';
import {
  receiving,
  where,
  type ReceiveOptions,
  type Receiving,
} from '@/modules/messaging/webhook/lines/webhook.lines';
import { readCalls, readPermissionReplies } from './webhook.calls';
import { ECHO_FIELD, readEchoes } from './webhook.echoes';
import { field, first, get, list, metaTime } from './webhook.fields';
import { toInbound } from './webhook.message';

// Meta's webhook envelope → flat inbound messages and delivery statuses (docs/12 §3.5). Fields
// are read by their Meta path («interactive.button_reply.id»). Lenient: an item we can't read is
// skipped, never a 500 (Meta would retry it forever).

function toStatus(s: unknown, ctx: { now: Date; at: Receiving }): StatusEvent | null {
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

type ChangeContext = ParseOptions & { batch: WebhookBatch };

interface ChangeRead {
  value: unknown;
  number: string | undefined;
  at: Receiving;
  ctx: ChangeContext;
}

/**
 * `messages` → the batch; `smb_message_echoes` → echoes; `calls` → batch.calls (docs/28, never
 * ticks); any other field is skipped.
 */
const CHANGE_READERS = new Map<string, (read: ChangeRead) => void>([
  ['messages', ({ value, at, ctx }) => readMessages(value, { ...ctx, at })],
  [ECHO_FIELD, ({ value, at, ctx }) => ctx.batch.echoes.push(...readEchoes(value, at))],
  [
    'calls',
    ({ value, number, ctx }) =>
      readCalls(value, {
        now: ctx.now,
        phoneNumberId: number ?? null,
        out: (ctx.batch.calls ??= []),
      }),
  ],
]);

function readChange(change: unknown, ctx: ChangeContext): void {
  const read = CHANGE_READERS.get(field(change, 'field') ?? '');
  if (!read) return;
  const value = get(change, 'value');
  const number = field(value, 'metadata.phone_number_id') ?? undefined;
  const at = receiving(number, ctx);
  if (at) read({ value, number, at, ctx });
}

/** A `messages` change's inbound messages and delivery statuses. */
function readMessages(
  value: unknown,
  ctx: ParseOptions & { batch: WebhookBatch; at: Receiving },
): void {
  const contacts = list(get(value, 'contacts'));
  const names = new Map(
    contacts.map((c) => [field(c, 'wa_id') ?? '', field(c, 'profile.name')?.trim() ?? '']),
  );
  for (const m of list(get(value, 'messages'))) {
    const event = toInbound(m, { names, now: ctx.now, at: ctx.at });
    if (event) ctx.batch.messages.push(event);
  }
  for (const s of list(get(value, 'statuses'))) {
    const event = toStatus(s, { now: ctx.now, at: ctx.at });
    if (event) ctx.batch.statuses.push(event);
  }
  if (ctx.at.phoneNumberId)
    readPermissionReplies(value, {
      now: ctx.now,
      phoneNumberId: ctx.at.phoneNumberId,
      batch: ctx.batch,
    });
}

export function parseWebhook(body: unknown, opts: ParseOptions): WebhookBatch {
  const batch: WebhookBatch = { messages: [], statuses: [], echoes: [] };
  for (const entry of list(get(body, 'entry'))) {
    for (const change of list(get(entry, 'changes'))) readChange(change, { ...opts, batch });
  }
  return batch;
}
