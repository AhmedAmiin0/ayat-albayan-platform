import { evolutionStateOf, type EvolutionState } from '@ab/shared';
import { z } from 'zod';
import type { InboundEvent, StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import type { Receiving } from '@/modules/messaging/webhook/lines/webhook.lines';
import { evolutionMetaMessage } from './webhook.evolution-message';
import { toInbound } from './webhook.parse';

// What POST /webhooks/evolution/:instance reads out of Evolution API v2's webhook (docs/19
// «Evolution driver», src/api/integrations/event/webhook/webhook.controller.ts):
// {event, instance, data, date_time, sender, server_url, apikey}. Only four events matter; any
// other one is acknowledged and dropped. Lenient: an item we can't read is skipped, never a 500.

const envelopeSchema = z.object({
  event: z.string().max(100),
  instance: z.string().max(200).optional(),
  data: z.unknown(),
});

/** Evolution's event names: «messages.upsert» (and the MESSAGES_UPSERT spelling of byEvents). */
const eventName = (raw: string): string => raw.toLowerCase().replace(/[_-]/g, '.');

/** MESSAGES_UPDATE item: one message's new status (fromMe = our outbound). */
const updateSchema = z.object({
  keyId: z.string().min(1).max(200),
  fromMe: z.boolean().optional(),
  status: z.string(),
});

/** Evolution's (Baileys') status spelling → our delivery ticks. */
const TICK: Readonly<Record<string, StatusEvent['status']>> = {
  SERVER_ACK: 'sent',
  DELIVERY_ACK: 'delivered',
  READ: 'read',
  PLAYED: 'read',
  ERROR: 'failed',
};

const connectionSchema = z.object({ state: z.string().optional() });

export type EvolutionDelivery =
  | { kind: 'inbound'; events: InboundEvent[] }
  | { kind: 'status'; events: StatusEvent[] }
  | { kind: 'state'; state: EvolutionState | null }
  | { kind: 'ignored'; event: string };

const asList = (data: unknown): unknown[] => (Array.isArray(data) ? data : [data]);

function inbound(data: unknown, at: { now: Date; where: Receiving }): EvolutionDelivery {
  const events = asList(data).flatMap((raw) => {
    const meta = evolutionMetaMessage(raw);
    const names = new Map(meta ? [[meta.from, meta.name ?? '']] : []);
    const event = meta ? toInbound(meta.message, { names, now: at.now, at: at.where }) : null;
    return event ? [event] : [];
  });
  return { kind: 'inbound', events };
}

function statuses(data: unknown, at: { now: Date; where: Receiving }): EvolutionDelivery {
  const events = asList(data).flatMap((raw): StatusEvent[] => {
    const u = updateSchema.safeParse(raw);
    const status = u.success && u.data.fromMe !== false ? TICK[u.data.status] : undefined;
    if (!u.success || !status) return [];
    const base = { waMessageId: u.data.keyId, status, at: at.now, errorCode: null };
    return [{ ...base, errorText: null, conversationId: null, pricingCategory: null, ...at.where }];
  });
  return { kind: 'status', events };
}

const stateOf = (data: unknown): EvolutionDelivery => ({
  kind: 'state',
  state: evolutionStateOf(connectionSchema.safeParse(data).data?.state),
});

type Reader = (data: unknown, at: { now: Date; where: Receiving }) => EvolutionDelivery;

const READERS: Readonly<Record<string, Reader>> = {
  'messages.upsert': inbound,
  'messages.update': statuses,
  'connection.update': stateOf,
  // A fresh QR means the instance waits for a scan: not connected.
  'qrcode.updated': () => ({ kind: 'state', state: 'connecting' }),
};

/** The envelope's instance, when it names one, is the URL's. */
const sameInstance = (named: string | undefined, url: string): boolean =>
  named === undefined || named === url;

/** One delivery; null = not Evolution's envelope, or another instance's (the URL names it). */
export function parseEvolution(
  body: unknown,
  at: { now: Date; where: Receiving; instance: string },
): EvolutionDelivery | null {
  const env = envelopeSchema.safeParse(body);
  if (!env.success || !sameInstance(env.data.instance, at.instance)) return null;
  const event = eventName(env.data.event);
  const read = READERS[event];
  return read ? read(env.data.data, at) : { kind: 'ignored', event };
}
