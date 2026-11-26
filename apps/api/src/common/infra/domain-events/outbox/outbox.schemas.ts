import { z } from 'zod';

/** A claimed public.domain_events row: what the transport needs; the event is parsed later. */
export const outboxRow = z.object({
  id: z.string(),
  kind: z.string(),
  payload: z.unknown(),
  occurred_at: z.string(),
  attempts: z.number().int().min(0),
});
export type OutboxRow = z.infer<typeof outboxRow>;

export const outboxRows = z.array(outboxRow);

export const settleStateSchema = z.enum(['done', 'retry', 'parked']);
export type SettleState = z.infer<typeof settleStateSchema>;

/** The DrainSummary counters a settled row adds to. */
export const drainCounterSchema = z.enum(['done', 'retried', 'parked']);
