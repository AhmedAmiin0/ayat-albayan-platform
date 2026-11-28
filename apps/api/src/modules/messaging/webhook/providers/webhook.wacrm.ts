import { z } from 'zod';
import { DELIVERY_STATUSES, type StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { parseReceived, type CrmReceived } from '@/modules/messaging/webhook/crm-inbound';

// What POST /webhooks/wacrm reads out of the CRM's delivery envelope (docs/19 «crm driver»):
// {id, event, occurred_at, account_id, data}. message.status_updated moves our rows (ticks);
// message.received is a message to the notifications number, mirrored into the inbox.

const envelopeSchema = z.object({
  id: z.string().min(1).max(200),
  event: z.string(),
  occurred_at: z.string().optional(),
  data: z.unknown(),
});

const statusSchema = z.object({
  whatsapp_message_id: z.string().min(1),
  status: z.string(),
  conversation_id: z.string().min(1).max(200).nullish(),
});

export type WacrmDelivery =
  | { id: string; kind: 'status'; status: StatusEvent }
  | { id: string; kind: 'received'; received: CrmReceived }
  | { id: string; kind: 'other'; event: string };

/** A time the CRM sent, else now (missing or unreadable). */
function atOf(raw: string | undefined, now: Date): Date {
  const at = raw ? new Date(raw) : now;
  return Number.isNaN(at.getTime()) ? now : at;
}

type Envelope = z.infer<typeof envelopeSchema>;

const other = (env: Envelope): WacrmDelivery => ({ id: env.id, kind: 'other', event: env.event });

/** message.received with its ids, else `other`. */
function received(env: Envelope, at: Date): WacrmDelivery {
  const r = parseReceived(env.data, at);
  return r ? { id: env.id, kind: 'received', received: r } : other(env);
}

const isDelivery = (s: string): s is StatusEvent['status'] => (DELIVERY_STATUSES as readonly string[]).includes(s);

/** message.status_updated with a status the delivery path knows, else `other`. */
function statusUpdate(env: Envelope, now: Date): WacrmDelivery {
  const data = statusSchema.safeParse(env.data).data;
  if (!data || !isDelivery(data.status)) return other(env);
  const status: StatusEvent = {
    waMessageId: data.whatsapp_message_id,
    status: data.status,
    at: atOf(env.occurred_at, now),
    errorCode: null,
    errorText: null,
    conversationId: null,
    pricingCategory: null,
    crm: { conversationId: data.conversation_id ?? null },
  };
  return { id: env.id, kind: 'status', status };
}

const READERS = new Map<string, (env: Envelope, now: Date) => WacrmDelivery>([
  ['message.received', (env, now) => received(env, atOf(env.occurred_at, now))],
  ['message.status_updated', statusUpdate],
]);

/**
 * One delivery; null = not the CRM's envelope. A status the delivery path does not know (or a
 * malformed one) reads as `other`. The CRM's conversation id is its own, never Meta's: never stored
 * on a row, only kept on the event to confirm a timed-out send (crm-confirm/).
 */
export function parseWacrm(body: unknown, now: Date): WacrmDelivery | null {
  const env = envelopeSchema.safeParse(body);
  if (!env.success) return null;
  const read = READERS.get(env.data.event);
  return read ? read(env.data, now) : other(env.data);
}

/**
 * Delivery ids seen within the signature window (the CRM may re-send; an older one is refused as
 * stale anyway). In memory per instance: a duplicate on another instance is harmless, statuses only
 * move forward.
 */
export class SeenDeliveries {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs: number) {}

  /** True the first time `id` is seen within the window; records it. */
  first(id: string, now: number): boolean {
    for (const [k, at] of this.seen) if (now - at > this.ttlMs) this.seen.delete(k);
    if (this.seen.has(id)) return false;
    this.seen.set(id, now);
    return true;
  }

  /**
   * A delivery whose work failed may come again (the CRM is best-effort, but a retry must not be
   * dropped).
   */
  forget(id: string): void {
    this.seen.delete(id);
  }
}
