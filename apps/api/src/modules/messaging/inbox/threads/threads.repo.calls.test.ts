import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import type { BalanceQueries } from '@/modules/finance/subscriptions/money/balance.queries';
import type { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import { ThreadsRepo } from './threads.repo';

// A family's message to the calls number (docs/28 §10) lands in their thread but never becomes a
// reply window (module mode); its read stamp is store/thread-reads.repo.test.ts.

const PHONE = '+201001234567';
const queries = (db: ReturnType<typeof fakeDb>['db']) =>
  new ThreadsRepo(db, {} as PackagesService, {} as BalanceQueries);

describe('ThreadsRepo and the calls number', () => {
  it('numberWindows: a calls window is dropped; chat and unstamped history stay', async () => {
    const rows = [
      { number_id: 'n-calls', line: 'calls', last_inbound_at: '2026-10-27T09:00:00Z' },
      { number_id: 'n-chat', line: 'chat', last_inbound_at: '2026-10-26T09:00:00Z' },
      { number_id: null, line: null, last_inbound_at: '2026-10-20T09:00:00Z' },
    ];
    const { db } = fakeDb({ v_thread_numbers: [{ data: rows }] });
    await expect(queries(db).numberWindows(PHONE)).resolves.toEqual([
      { numberId: 'n-chat', line: 'chat', lastInboundAt: '2026-10-26T09:00:00Z' },
      { numberId: null, line: 'notifications', lastInboundAt: '2026-10-20T09:00:00Z' },
    ]);
  });
});
