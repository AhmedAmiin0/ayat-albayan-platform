import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { MyRepo } from './my.repo';

const T = 'assistant_commissions';

describe('MyRepo.commissionPage past the last page', () => {
  it('answers no rows with the real total, newest first then id', async () => {
    const fake = fakeDb({ [T]: pastEnd(2) });
    const page = await new MyRepo(fake.db).commissionPage('a1', { page: 2, pageSize: 20 });
    expect(page).toEqual({ rows: [], total: 2 });
    expect(rangesOn(fake, T)).toEqual([[20, 39], [0, 0]]);
    expect(fake.calls.filter((c) => c.method === 'order').map((c) => c.args).slice(0, 2)).toEqual([
      ['earned_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
  });
});
