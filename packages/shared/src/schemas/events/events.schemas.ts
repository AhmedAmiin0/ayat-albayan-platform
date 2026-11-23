import { instant } from '@ab/core';
import { z } from 'zod';

const envelope = z.object({ id: z.uuid(), occurred_at: instant });

const eventOf = <K extends string, P extends z.ZodObject>(kind: K, payload: P) =>
  envelope.extend({ kind: z.literal(kind), payload });

// Payloads carry ids only, never personal data: a listener reads the rest itself (docs/57 §4.4).
const probe = z.strictObject({ probe_id: z.uuid() });

/** One schema per kind. `events.probe` only proves the transport end to end. */
const CATALOGUE = [eventOf('events.probe', probe)] as const;

export const domainEvent = z.discriminatedUnion('kind', CATALOGUE);
export type DomainEvent = z.infer<typeof domainEvent>;
export type EventKind = DomainEvent['kind'];
export type EventOf<K extends EventKind> = Extract<DomainEvent, { kind: K }>;

export const EVENT_KINDS: readonly EventKind[] = CATALOGUE.map((s) => s.shape.kind.value);

/** The outbox's last_error column holds at most 500 characters. */
const REASON_MAX = 500;

/** An outbox row (or any raw value) as a typed event, or why it is not one. */
export function parseDomainEvent(
  raw: unknown,
): { ok: true; event: DomainEvent } | { ok: false; reason: string } {
  const parsed = domainEvent.safeParse(raw);
  return parsed.success
    ? { ok: true, event: parsed.data }
    : { ok: false, reason: z.prettifyError(parsed.error).slice(0, REASON_MAX) };
}
