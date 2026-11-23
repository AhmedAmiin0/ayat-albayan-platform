import { randomUUID } from 'node:crypto';
import type { OutboxRow } from './outbox.schemas';
import type { ClaimRequest, OutboxStore, Settled, SettleState } from './outbox.types';

// Test helper (not a test): public.domain_events in memory, with the claim and finish rules of
// claim_domain_events / finish_domain_events.

interface FakeRow extends OutboxRow {
  next_attempt_at: Date;
  claimed_by: string | null;
  claimed_at: Date | null;
  processed_at: Date | null;
  parked_at: Date | null;
  last_error: string | null;
}

const APPLY: Record<SettleState, (row: FakeRow, r: Settled, now: Date) => void> = {
  done: (row, _r, now) => (row.processed_at = now),
  retry: (row, r) => (row.next_attempt_at = r.at ?? row.next_attempt_at),
  parked: (row, _r, now) => (row.parked_at = now),
};

const open = (row: FakeRow): boolean => row.processed_at === null && row.parked_at === null;
const unheld = (row: FakeRow, staleBefore: Date): boolean =>
  row.claimed_at === null || row.claimed_at < staleBefore;
const byDue = (a: FakeRow, b: FakeRow): number =>
  a.next_attempt_at.getTime() - b.next_attempt_at.getTime();

export class FakeOutboxStore implements OutboxStore {
  private readonly rows = new Map<string, FakeRow>();
  private claimError: Error | null = null;
  lastClaim: ClaimRequest | null = null;

  constructor(private readonly now: () => Date = () => new Date()) {}

  /** enqueue_domain_event: a known id is a no-op (rule 8). */
  enqueue(input: { kind: string; payload: unknown; id?: string }): string {
    const id = input.id ?? randomUUID();
    const at = this.now();
    const row: FakeRow = {
      id,
      kind: input.kind,
      payload: input.payload,
      occurred_at: at.toISOString(),
      attempts: 0,
      next_attempt_at: at,
      ...{ claimed_by: null, claimed_at: null, processed_at: null, parked_at: null },
      last_error: null,
    };
    this.rows.set(id, this.rows.get(id) ?? row);
    return id;
  }

  failNextClaim(error: Error): void {
    this.claimError = error;
  }

  claim(req: ClaimRequest): Promise<OutboxRow[]> {
    this.lastClaim = req;
    const failure = this.claimError;
    this.claimError = null;
    if (failure) return Promise.reject(failure);
    const now = this.now();
    const due = [...this.rows.values()]
      .filter((r) => open(r) && r.next_attempt_at <= now && unheld(r, req.staleBefore))
      .sort(byDue)
      .slice(0, req.limit);
    due.forEach((r) => Object.assign(r, { claimed_by: req.token, claimed_at: now }));
    return Promise.resolve(due.map((r) => ({ ...r })));
  }

  finish(token: string, results: readonly Settled[]): Promise<void> {
    const now = this.now();
    for (const r of results) this.settle(token, r, now);
    return Promise.resolve();
  }

  rowOf(id: string): FakeRow | undefined {
    return this.rows.get(id);
  }

  stateOf(id: string): 'pending' | 'done' | 'parked' {
    const row = this.rows.get(id);
    const states = { done: row?.processed_at, parked: row?.parked_at } as const;
    return (['done', 'parked'] as const).find((s) => states[s]) ?? 'pending';
  }

  private settle(token: string, r: Settled, now: Date): void {
    const row = this.rows.get(r.id);
    if (row?.claimed_by !== token) return;
    APPLY[r.state](row, r, now);
    row.attempts += 1;
    row.last_error = r.error ?? row.last_error;
    Object.assign(row, { claimed_by: null, claimed_at: null });
  }
}
