import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { fakePhotos } from '@/common/storage/avatars/avatars.fakes';
import { SalesAcademyRepo } from '@/modules/sales/sales/academy/sales-academy.repo';

describe('SalesAcademyRepo.students past the last page', () => {
  it('answers no rows with the real total, by name then id', async () => {
    const fake = fakeDb({ students: pastEnd(41) });
    const repo = new SalesAcademyRepo(fake.db, fakePhotos().photos);
    const page = await repo.students({ page: 9, pageSize: 20 });
    expect(page).toEqual({ rows: [], total: 41 });
    expect(rangesOn(fake, 'students')).toEqual([[160, 179], [0, 0]]);
    const orders = fake.calls.filter((c) => c.method === 'order').map((c) => c.args);
    expect(orders.slice(0, 2)).toEqual([['name', { ascending: true }], ['id', { ascending: true }]]);
  });
});
