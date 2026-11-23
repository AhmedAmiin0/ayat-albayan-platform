import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { DomainEventsRepo } from './domain-events.repo';

// The outbox's two RPCs (migration 20261123000100): the claim and the batched finish.

const CLAIM = 'rpc:claim_domain_events';
const FINISH = 'rpc:finish_domain_events';
const TOKEN = '5a1e2b3c-4d5e-4f60-8a71-b2c3d4e5f607';
const STALE = new Date('2026-11-23T07:55:00Z');
const ROW = {
  id: '7d3f6a52-8f4e-4c55-9f0e-5a2b1c3d4e5f',
  kind: 'events.probe',
  payload: { probe_id: '0b6c1d2e-3f40-4a51-8b62-7c8d9e0f1a2b' },
  occurred_at: '2026-11-23T07:59:00+00:00',
  attempts: 1,
  claimed_by: TOKEN,
};

describe('DomainEventsRepo', () => {
  it('claim: one RPC with the batch, the stale cutoff and the pass token', async () => {
    const { db, argsOf } = fakeDb({ [CLAIM]: [{ data: [ROW] }] });
    const repo = new DomainEventsRepo(db);
    const rows = await repo.claim({ limit: 25, token: TOKEN, staleBefore: STALE });
    expect(argsOf(CLAIM, 'rpc')).toEqual([
      { p_limit: 25, p_token: TOKEN, p_stale_before: '2026-11-23T07:55:00.000Z' },
    ]);
    const { claimed_by: _token, ...row } = ROW;
    expect(rows).toEqual([row]);
  });

  it('claim: a row of the wrong shape fails the pass instead of being delivered', async () => {
    const { db } = fakeDb({ [CLAIM]: [{ data: [{ ...ROW, attempts: 'one' }] }] });
    const repo = new DomainEventsRepo(db);
    await expect(repo.claim({ limit: 1, token: TOKEN, staleBefore: STALE })).rejects.toThrow();
  });

  it('claim: a database error is thrown', async () => {
    const { db } = fakeDb({ [CLAIM]: [{ error: { message: 'timeout' } }] });
    const repo = new DomainEventsRepo(db);
    await expect(repo.claim({ limit: 1, token: TOKEN, staleBefore: STALE })).rejects.toThrow();
  });

  it('finish: every outcome of the pass in one RPC, instants as ISO strings', async () => {
    const { db, argsOf, trips } = fakeDb({ [FINISH]: [{ data: 3 }] });
    const at = new Date('2026-11-23T08:00:10Z');
    await new DomainEventsRepo(db).finish(TOKEN, [
      { id: 'a', state: 'done', at: null, error: null },
      { id: 'b', state: 'retry', at, error: 'down' },
      { id: 'c', state: 'parked', at: null, error: 'unknown kind' },
    ]);
    expect(trips).toEqual([FINISH]);
    expect(argsOf(FINISH, 'rpc')).toEqual([
      {
        p_token: TOKEN,
        p_results: [
          { id: 'a', state: 'done', at: null, error: null },
          { id: 'b', state: 'retry', at: '2026-11-23T08:00:10.000Z', error: 'down' },
          { id: 'c', state: 'parked', at: null, error: 'unknown kind' },
        ],
      },
    ]);
  });

  it('finish: a database error is thrown', async () => {
    const { db } = fakeDb({ [FINISH]: [{ error: { message: 'timeout' } }] });
    await expect(new DomainEventsRepo(db).finish(TOKEN, [])).rejects.toThrow();
  });
});
