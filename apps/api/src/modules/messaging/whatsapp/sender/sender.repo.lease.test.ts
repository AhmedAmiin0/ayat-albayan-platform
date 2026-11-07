import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { CLAIM_LEASE_MS, UNCERTAIN } from './send-plan';
import { SenderRepo } from './sender.repo';

// #695 review, item 1: an UNRECORDED failure is written only while the row is still SENDING at the
// attempt it was read at, so a stale copy never turns a sent or retrying row into UNCERTAIN.

const M = 'messages';
const PLAN = { status: 'failed' as const, next_attempt_at: null, error_code: UNCERTAIN, error_text: 'x' };
const eqs = (calls: { table: string; method: string; args: unknown[] }[]) =>
  calls.filter((c) => c.table === M && c.method === 'eq').map((c) => c.args);

describe('SenderRepo — the claim lease and the UNRECORDED write', () => {
  it('failure(…, { attempts }) compares-and-sets on queued + SENDING + that attempt', async () => {
    const { db, calls } = fakeDb({ [M]: [{}] });
    await new SenderRepo(db).failure('m1', PLAN, { attempts: 2 });
    expect(eqs(calls)).toEqual([
      ['id', 'm1'], ['status', 'queued'], ['error_code', 'sending'], ['attempts', 2],
    ]);
  });

  it('any other failure stays on queued only', async () => {
    const { db, calls } = fakeDb({ [M]: [{}] });
    await new SenderRepo(db).failure('m1', PLAN);
    expect(eqs(calls)).toEqual([['id', 'm1'], ['status', 'queued']]);
  });

  it('the lease runs from the now it is given (the row\'s, drain-lanes), never the pass start', async () => {
    const { db, argsOf } = fakeDb({ [M]: [{ data: [{ id: 'm1' }] }] });
    const now = new Date('2026-11-07T08:03:00Z');
    await new SenderRepo(db).claim({ id: 'm1', attempts: 0, now });
    const lease = new Date(now.getTime() + CLAIM_LEASE_MS).toISOString();
    expect(argsOf(M, 'update')).toEqual([expect.objectContaining({ next_attempt_at: lease })]);
  });
});
