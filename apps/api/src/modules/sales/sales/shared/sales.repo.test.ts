import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { IN_CHUNK } from '@/common/db/read-all';
import { fakeDb } from '@/common/db/testing/fake-db';
import { SalesRepo } from './sales.repo';

const INPUT = { studentIds: ['s1'], statuses: ['active' as const] };

describe('SalesRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ subscriptions: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new SalesRepo(db).subscriptions(INPUT))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ subscriptions: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new SalesRepo(db).subscriptions(INPUT))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});

describe('SalesRepo.subscriptions: a long id list', () => {
  const ids = Array.from({ length: IN_CHUNK + 50 }, (_, i) => `s${i}`);
  const sub = (id: string, startsOn: string) => ({ id, starts_on: startsOn });

  it('reads the ids in IN_CHUNK requests and keeps the newest start first across them', async () => {
    const { db, calls, trips } = fakeDb({
      subscriptions: [
        { data: [sub('a', '2026-09-01'), sub('b', '2026-07-01')] },
        { data: [sub('c', '2026-08-01')] },
      ],
    });
    const out = await new SalesRepo(db).subscriptions({ ...INPUT, studentIds: ids });
    expect(trips).toEqual(['subscriptions', 'subscriptions']);
    const sent = calls.filter((c) => c.method === 'in' && c.args[0] === 'student_id');
    expect(sent.map((c) => c.args[1])).toEqual([ids.slice(0, IN_CHUNK), ids.slice(IN_CHUNK)]);
    expect(out.map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });
});
