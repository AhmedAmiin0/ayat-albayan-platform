import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { FeedbackReadRepo } from './feedback.read.repo';

const T = 'lesson_feedback';

describe('FeedbackReadRepo.page past the last page', () => {
  it('answers no rows with the real total and keeps the kind filter on the count read', async () => {
    const fake = fakeDb({ [T]: pastEnd(12) });
    const repo = new FeedbackReadRepo(fake.db);
    const page = await repo.page({ filter: { kind: 'trial' }, page: { page: 4, pageSize: 10 } });
    expect(page).toEqual({ rows: [], total: 12 });
    expect(rangesOn(fake, T)).toEqual([[30, 39], [0, 0]]);
    const eqs = fake.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['kind', 'trial'], ['kind', 'trial']]);
  });
});
