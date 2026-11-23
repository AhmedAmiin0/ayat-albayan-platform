import { randomUUID } from 'node:crypto';
import { parseDomainEvent } from '@ab/shared';
import { Ticker } from '@/common/jobs';
import { runHandler } from '@/common/infra/domain-events/event-handlers';
import type { EventHandlers } from '@/common/infra/domain-events/event-handlers.types';
import type { DrainSummary, EventTransport } from '@/common/infra/domain-events/event-transport.port';
import { errorText, MAX_ATTEMPTS, retryDelayMs, settleFailure } from './outbox-retry';
import type { OutboxRow } from './outbox.schemas';
import type { OutboxStore, OutboxTransportOptions, Settled, SettleState } from './outbox.types';

const EMPTY: DrainSummary = { claimed: 0, done: 0, retried: 0, parked: 0 };
const COUNTER: Record<SettleState, keyof DrainSummary> = {
  done: 'done',
  retry: 'retried',
  parked: 'parked',
};
const DEFAULTS: Required<OutboxTransportOptions> = {
  retry: { maxAttempts: MAX_ATTEMPTS, delayMs: retryDelayMs },
  now: () => new Date(),
  staleMs: 5 * 60_000,
  batch: 25,
};
// poll: the ticker is the delivery itself until a queue adapter replaces it; the partial due
// index keeps an empty tick to one index probe. First run late: every API test boots AppModule.
const TIMING = { firstMs: 30_000, everyMs: 5_000 };

const summarize = (results: readonly Settled[]): DrainSummary =>
  results.reduce(
    (sum, r) => ({ ...sum, [COUNTER[r.state]]: sum[COUNTER[r.state]] + 1 }),
    { ...EMPTY, claimed: results.length },
  );

const done = (id: string): Settled => ({ id, state: 'done', at: null, error: null });
const parked = (id: string, error: string): Settled => ({ id, state: 'parked', at: null, error });

/**
 * Claims due outbox rows, parses each with the catalogue, runs its handler and records the
 * outcome for the whole batch in one write. An event that cannot parse is parked at once: a
 * retry cannot fix it. A crash before the finish leaves the claim to go stale and the row is
 * delivered again, which is why handlers are idempotent by event id.
 */
export class OutboxTickerTransport implements EventTransport {
  private handlers: EventHandlers | null = null;
  private readonly passes = new Set<Promise<DrainSummary>>();
  private readonly ticker = new Ticker({ name: 'DomainEvents', ...TIMING, run: () => this.drainOnce() });
  private readonly opts: Required<OutboxTransportOptions>;

  constructor(
    private readonly store: OutboxStore,
    options: OutboxTransportOptions = {},
  ) {
    this.opts = { ...DEFAULTS, ...options };
  }

  start(handlers: EventHandlers): void {
    this.handlers = handlers;
    this.ticker.start();
  }

  async stop(): Promise<void> {
    this.handlers = null;
    await Promise.allSettled([this.ticker.stop(), ...this.passes]);
  }

  drainOnce(): Promise<DrainSummary> {
    const handlers = this.handlers;
    if (handlers === null) return Promise.resolve(EMPTY);
    const pass = this.pass(handlers);
    const forget = () => this.passes.delete(pass);
    this.passes.add(pass);
    pass.then(forget, forget);
    return pass;
  }

  private async pass(handlers: EventHandlers): Promise<DrainSummary> {
    const token = randomUUID();
    const staleBefore = new Date(this.opts.now().getTime() - this.opts.staleMs);
    const rows = await this.store.claim({ limit: this.opts.batch, token, staleBefore });
    if (rows.length === 0) return EMPTY;
    const results: Settled[] = [];
    // One at a time, oldest first: handlers see events in the order they happened.
    for (const row of rows) results.push(await this.deliver(row, handlers));
    await this.store.finish(token, results);
    return summarize(results);
  }

  private deliver(row: OutboxRow, handlers: EventHandlers): Promise<Settled> {
    const parsed = parseDomainEvent(row);
    if (!parsed.ok) return Promise.resolve(parked(row.id, parsed.reason));
    const { event } = parsed;
    const settle = { ...this.opts.retry, now: this.opts.now };
    return runHandler(handlers, event.kind, event).then(
      () => done(row.id),
      (e: unknown) => settleFailure(row, errorText(e), settle),
    );
  }
}
