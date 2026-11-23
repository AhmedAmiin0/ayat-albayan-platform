import { describe, expect, it } from 'vitest';
import { eventTransportContract } from '@/common/infra/domain-events/testing/event-transport.contract';
import { OutboxTickerTransport } from './event-transport.outbox.adapter';
import { FakeOutboxStore } from './outbox.fake';

// The outbox adapter against an in-memory store with the SQL's claim and finish rules.

const NOW = new Date('2026-11-23T08:00:00Z');
const PROBE = { probe_id: '0b6c1d2e-3f40-4a51-8b62-7c8d9e0f1a2b' };
const noop = { 'events.probe': () => Promise.resolve() };

eventTransportContract('outbox ticker (fake store)', ({ maxAttempts }) => {
  const store = new FakeOutboxStore(() => NOW);
  const transport = new OutboxTickerTransport(store, {
    retry: { maxAttempts, delayMs: () => 0 },
    now: () => NOW,
  });
  return {
    transport,
    publish: (row) => Promise.resolve(store.enqueue(row)),
    stateOf: (id) => Promise.resolve(store.stateOf(id)),
  };
});

describe('OutboxTickerTransport', () => {
  it('schedules a retry from the attempt count and the clock', async () => {
    const store = new FakeOutboxStore(() => NOW);
    const id = store.enqueue({ kind: 'events.probe', payload: PROBE });
    const transport = new OutboxTickerTransport(store, {
      retry: { maxAttempts: 5, delayMs: (attempt) => attempt * 1_000 },
      now: () => NOW,
    });
    transport.start({ 'events.probe': () => Promise.reject(new Error('down')) });
    await expect(transport.drainOnce()).resolves.toEqual({
      claimed: 1,
      done: 0,
      retried: 1,
      parked: 0,
    });
    await transport.stop();
    expect(store.rowOf(id)).toMatchObject({
      attempts: 1,
      next_attempt_at: new Date(NOW.getTime() + 1_000),
      last_error: 'down',
    });
  });

  it('reclaims a row whose claim went stale (a worker that died mid-pass)', async () => {
    const store = new FakeOutboxStore(() => NOW);
    store.enqueue({ kind: 'events.probe', payload: PROBE });
    const transport = new OutboxTickerTransport(store, { now: () => NOW, staleMs: 60_000 });
    transport.start(noop);
    await transport.drainOnce();
    await transport.stop();
    expect(store.lastClaim?.staleBefore).toEqual(new Date(NOW.getTime() - 60_000));
  });

  it('claims nothing before start() and after stop()', async () => {
    const store = new FakeOutboxStore(() => NOW);
    const id = store.enqueue({ kind: 'events.probe', payload: PROBE });
    const transport = new OutboxTickerTransport(store, { now: () => NOW });
    await expect(transport.drainOnce()).resolves.toMatchObject({ claimed: 0 });
    transport.start(noop);
    await transport.stop();
    await expect(transport.drainOnce()).resolves.toMatchObject({ claimed: 0 });
    expect(store.stateOf(id)).toBe('pending');
  });

  it('a store failure rejects the pass and leaves the rows for the next one', async () => {
    const store = new FakeOutboxStore(() => NOW);
    store.failNextClaim(new Error('db down'));
    const transport = new OutboxTickerTransport(store, { now: () => NOW });
    transport.start(noop);
    await expect(transport.drainOnce()).rejects.toThrow('db down');
    await expect(transport.stop()).resolves.toBeUndefined();
  });
});
