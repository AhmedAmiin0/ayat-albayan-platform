import type { EventHandlers } from './event-handlers.types';

export interface DrainSummary {
  claimed: number;
  done: number;
  retried: number;
  parked: number;
}

/**
 * The consumer side of domain events. Producers always write public.domain_events in SQL, inside
 * their own transaction (enqueue_domain_event), so the outbox stays the source of truth whatever
 * delivers it. A queue-library adapter (pg-boss, BullMQ) relays outbox rows into its queue.
 * Every adapter passes testing/event-transport.contract.ts.
 */
export interface EventTransport {
  start(handlers: EventHandlers): void;
  /** No new deliveries; resolves once the pass in flight (its handlers and finish) is over. */
  stop(): Promise<void>;
  /** One pass now: tests and a kick. Claims nothing before start() or after stop(). */
  drainOnce(): Promise<DrainSummary>;
}
