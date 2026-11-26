import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { PaymentsRepo } from './payments.repo';

describe('PaymentsRepo.list past the last page', () => {
  it('answers an empty page with the real total', async () => {
    const fake = fakeDb({ payments: pastEnd(3) });
    const page = await new PaymentsRepo(fake.db).list({ page: 2, pageSize: 20 });
    expect(page).toEqual({ items: [], total: 3, page: 2, pageSize: 20 });
    expect(rangesOn(fake, 'payments')).toEqual([[20, 39], [0, 0]]);
  });
});
