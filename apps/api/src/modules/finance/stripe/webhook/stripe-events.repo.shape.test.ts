import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { StripeEventsRepo } from './stripe-events.repo';

type Calls = ReturnType<typeof fakeDb>['calls'];
const argsAll = (calls: Calls, method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

const EVENT = { id: 'evt_1', type: 'checkout.session.completed' };

afterEach(() => {
  vi.useRealTimers();
});

describe('StripeEventsRepo.begin: insert once, then read processed_at', () => {
  it('two trips: an upsert that ignores duplicates, then a single read by event_id', async () => {
    const { db, calls, trips } = fakeDb({ stripe_events: [{}, { data: { processed_at: null } }] });
    expect(await new StripeEventsRepo(db).begin(EVENT)).toBe(false);
    expect(trips).toEqual(['stripe_events', 'stripe_events']);
    expect(argsAll(calls, 'upsert')).toEqual([
      [
        { event_id: 'evt_1', type: 'checkout.session.completed' },
        { onConflict: 'event_id', ignoreDuplicates: true },
      ],
    ]);
    expect(argsAll(calls, 'select')).toEqual([['processed_at']]);
    expect(argsAll(calls, 'eq')).toEqual([['event_id', 'evt_1']]);
    expect(argsAll(calls, 'single')).toEqual([[]]);
  });

  it('true when the event was processed already', async () => {
    const processed = { data: { processed_at: '2026-11-23T10:00:00Z' } };
    const { db } = fakeDb({ stripe_events: [{}, processed] });
    expect(await new StripeEventsRepo(db).begin(EVENT)).toBe(true);
  });

  it('an insert error is thrown before any read', async () => {
    const { db, trips } = fakeDb({ stripe_events: [{ error: { message: 'boom' } }] });
    await expect(new StripeEventsRepo(db).begin(EVENT)).rejects.toThrow(
      'stripe_events insert failed: boom',
    );
    expect(trips).toEqual(['stripe_events']);
  });

  it('a read error is thrown', async () => {
    const { db } = fakeDb({ stripe_events: [{}, { error: { message: 'gone' } }] });
    await expect(new StripeEventsRepo(db).begin(EVENT)).rejects.toThrow(
      'stripe_events read failed: gone',
    );
  });
});

describe('StripeEventsRepo.done', () => {
  it('stamps processed_at with now and the result, on that event only', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T10:00:00.000Z'));
    const { db, calls, trips } = fakeDb({ stripe_events: [{}] });
    await new StripeEventsRepo(db).done('evt_1', 'paid');
    expect(trips).toEqual(['stripe_events']);
    expect(argsAll(calls, 'update')).toEqual([
      [{ processed_at: '2026-11-23T10:00:00.000Z', result: 'paid' }],
    ]);
    expect(argsAll(calls, 'eq')).toEqual([['event_id', 'evt_1']]);
  });

  it('an update error is thrown', async () => {
    const { db } = fakeDb({ stripe_events: [{ error: { message: 'boom' } }] });
    await expect(new StripeEventsRepo(db).done('evt_1', 'paid')).rejects.toThrow(
      'stripe_events update failed: boom',
    );
  });
});
