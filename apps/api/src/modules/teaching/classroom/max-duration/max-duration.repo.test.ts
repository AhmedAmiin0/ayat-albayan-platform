import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { MaxDurationRepo, RUN_CAP } from './max-duration.repo';

type Call = [string, ...unknown[]];
const READS = ['select', 'is', 'or', 'order', 'limit'];

/** A PostgREST stand-in that records reads and fails the test on any write. */
function fakeDb(data: unknown[]) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const name of READS) {
    builder[name] = (...args: unknown[]) => (calls.push([name, ...args]), builder);
  }
  for (const name of ['update', 'insert', 'upsert', 'delete']) {
    builder[name] = () => {
      throw new Error(`write: ${name}`);
    };
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null });
  const from = (table: string) => (calls.push(['from', table]), builder);
  return { db: { from, rpc: () => Promise.reject(new Error('rpc')) } as unknown as Db, calls };
}

const CUTOFF = new Date('2026-10-30T10:00:00.000Z');

describe('MaxDurationRepo', () => {
  it('selects meetings not ended nor cancelled, started (else created) before the cutoff', async () => {
    const { db, calls } = fakeDb([]);
    await new MaxDurationRepo(db).overdueMeetings(CUTOFF);
    const at = CUTOFF.toISOString();
    expect(calls).toEqual([
      ['from', 'meetings'],
      ['select', 'id, created_at, starts_at, ends_at, cancelled_at'],
      ['is', 'ends_at', null],
      ['is', 'cancelled_at', null],
      ['or', `starts_at.lt.${at},and(starts_at.is.null,created_at.lt.${at})`],
      ['order', 'created_at', { ascending: true }],
      ['limit', RUN_CAP],
    ]);
  });
});
