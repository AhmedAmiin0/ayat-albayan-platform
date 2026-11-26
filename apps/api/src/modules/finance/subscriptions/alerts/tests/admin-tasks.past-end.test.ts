import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { AdminTasksRepo } from '@/modules/finance/subscriptions/alerts/admin-tasks.repo';

describe('AdminTasksRepo.list past the last page', () => {
  it('answers an empty page with the real total, newest first then by id', async () => {
    const fake = fakeDb({ admin_tasks: pastEnd(4) });
    const page = await new AdminTasksRepo(fake.db).list({ page: 2, pageSize: 50, open: true });
    expect(page).toEqual({ items: [], total: 4, page: 2, pageSize: 50 });
    expect(rangesOn(fake, 'admin_tasks')).toEqual([[50, 99], [0, 0]]);
    const orders = fake.calls.filter((c) => c.method === 'order').map((c) => c.args);
    expect(orders.slice(0, 2)).toEqual([['created_at', { ascending: false }], ['id', { ascending: true }]]);
  });
});
