import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { InvoicesRepo } from './invoices.repo';

describe('InvoicesRepo.recent past the last page', () => {
  it('answers no rows with the real total', async () => {
    const fake = fakeDb({ invoices: pastEnd(5) });
    const page = await new InvoicesRepo(fake.db).recent({ page: 4, pageSize: 10 });
    expect(page).toEqual({ rows: [], total: 5 });
    expect(rangesOn(fake, 'invoices')).toEqual([[30, 39], [0, 0]]);
  });
});
