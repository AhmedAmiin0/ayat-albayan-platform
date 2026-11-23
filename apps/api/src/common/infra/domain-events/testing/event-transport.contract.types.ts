import type { EventTransport } from '@/common/infra/domain-events/event-transport.port';

type RowState = 'pending' | 'done' | 'parked';

/** One transport wired to its store, as a producer and an admin would see it. */
export interface ContractHarness {
  transport: EventTransport;
  /** Writes one outbox row the way enqueue_domain_event does; resolves to its id. */
  publish(row: { kind: string; payload: unknown }): Promise<string>;
  stateOf(id: string): Promise<RowState>;
}

/** A retry must be due at once in the harness, so the suite needs no clock. */
export interface ContractOptions {
  maxAttempts: number;
}

export type HarnessFactory = (opts: ContractOptions) => ContractHarness | Promise<ContractHarness>;
