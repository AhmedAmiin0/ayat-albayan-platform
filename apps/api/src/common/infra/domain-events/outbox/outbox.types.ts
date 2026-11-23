import type { OutboxRow } from './outbox.schemas';

export interface ClaimRequest {
  limit: number;
  /** One per pass: a finish only touches the rows this pass still holds. */
  token: string;
  /** A claim older than this belongs to a worker that died: the row is claimed again. */
  staleBefore: Date;
}

export type SettleState = 'done' | 'retry' | 'parked';

export interface Settled {
  id: string;
  state: SettleState;
  /** When a retry is due; null otherwise. */
  at: Date | null;
  error: string | null;
}

/** The outbox as the transport sees it: DomainEventsRepo in the app, FakeOutboxStore in tests. */
export interface OutboxStore {
  claim(req: ClaimRequest): Promise<OutboxRow[]>;
  finish(token: string, results: readonly Settled[]): Promise<void>;
}

export interface RetryPolicy {
  maxAttempts: number;
  delayMs: (attempt: number) => number;
}

export interface SettleOptions extends RetryPolicy {
  now: () => Date;
}

export interface OutboxTransportOptions {
  retry?: RetryPolicy;
  now?: () => Date;
  staleMs?: number;
  batch?: number;
}
