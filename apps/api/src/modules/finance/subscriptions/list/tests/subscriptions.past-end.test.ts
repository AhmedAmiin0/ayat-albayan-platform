import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { SubscriptionsRepo } from '@/modules/finance/subscriptions/shared/subscriptions.repo';

describe('SubscriptionsRepo.list past the last page', () => {
  it('answers an empty page with the real total', async () => {
    const fake = fakeDb({ subscriptions: pastEnd(2) });
    const page = await new SubscriptionsRepo(fake.db).list({ page: 3, pageSize: 25 });
    expect(page).toEqual({ items: [], total: 2, page: 3, pageSize: 25 });
    expect(rangesOn(fake, 'subscriptions')).toEqual([[50, 74], [0, 0]]);
  });
});
