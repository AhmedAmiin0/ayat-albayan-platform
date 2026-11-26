import { describe, expect, it } from 'vitest';
import type { BalanceRepo } from '@/modules/finance/subscriptions/money/balance.repo';
import type { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

const V = 'v_threads';

describe('ThreadsRepo.list past the last page', () => {
  it('answers no threads with the real total instead of a 500', async () => {
    const fake = fakeDb({ [V]: pastEnd(8) });
    const repo = new ThreadsRepo(fake.db, {} as PackagesService, {} as BalanceRepo);
    expect(await repo.list({ page: 3, pageSize: 10 })).toEqual({ items: [], total: 8 });
    expect(rangesOn(fake, V)).toEqual([[20, 29], [0, 0]]);
  });
});
