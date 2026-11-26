import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { LeadsRepo } from './leads.repo';

describe('LeadsRepo.list past the last page', () => {
  it('answers no rows with the real total and keeps the status filter on the count read', async () => {
    const fake = fakeDb({ leads: pastEnd(26) });
    const page = await new LeadsRepo(fake.db).list({ page: 3, pageSize: 25, status: 'new' });
    expect(page).toEqual({ items: [], total: 26 });
    expect(rangesOn(fake, 'leads')).toEqual([[50, 74], [0, 0]]);
    const eqs = fake.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['status', 'new'], ['status', 'new']]);
  });
});
