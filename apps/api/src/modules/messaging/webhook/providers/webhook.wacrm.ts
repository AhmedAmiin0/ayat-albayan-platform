import { z } from 'zod';
import { DELIVERY_STATUSES, type StatusEvent } from '../webhook.events';

// What POST /webhooks/wacrm reads out of the CRM's delivery envelope (docs/19 «crm driver»):
// {id, event, occurred_at, account_id, data}. Only message.status_updated moves our rows (ticks).

const envelopeSchema = z.object({
  id: z.string().min(1).max(200),
  event: z.string(),
  occurred_at: z.string().optional(),
  data: z.unknown(),
});

const statusSchema = z.object({ whatsapp_message_id: z.string().min(1), status: z.string() });

type WacrmDelivery =
  | { id: string; kind: 'status'; status: StatusEvent }
  | { id: string; kind: 'received' | 'other'; event: string };

const isDelivery = (s: string): s is StatusEvent['status'] => (DELIVERY_STATUSES as readonly string[]).includes(s);

/**
 * One delivery; null = not the CRM's envelope. A status the delivery path does not know (or a malformed
 * one) reads as `other`. The CRM's conversation id is its own, never Meta's: not stored.
 */
export function parseWacrm(body: unknown, now: Date): WacrmDelivery | null {
  const env = envelopeSchema.safeParse(body);
  if (!env.success) return null;
  const { id, event } = env.data;
  if (event === 'message.received') return { id, kind: 'received', event };
  const data = event === 'message.status_updated' ? statusSchema.safeParse(env.data.data) : null;
  if (!data?.success || !isDelivery(data.data.status)) return { id, kind: 'other', event };
  const at = env.data.occurred_at ? new Date(env.data.occurred_at) : now;
  const status: StatusEvent = {
    waMessageId: data.data.whatsapp_message_id,
    status: data.data.status,
    at: Number.isNaN(at.getTime()) ? now : at,
    errorCode: null,
    errorText: null,
    conversationId: null,
    pricingCategory: null,
  };
  return { id, kind: 'status', status };
}

/**
 * Delivery ids seen within the signature window (the CRM may re-send; an older one is refused as stale
 * anyway). In memory per instance: a duplicate on another instance is harmless, statuses only move forward.
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

  /** A delivery whose work failed may come again (the CRM is best-effort, but a retry must not be dropped). */
  forget(id: string): void {
    this.seen.delete(id);
  }
}
