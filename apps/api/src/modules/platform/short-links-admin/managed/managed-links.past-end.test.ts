import { shortLinkListQuerySchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { ManagedLinksRepo } from './managed-links.repo';

const T = 'short_links';

describe('ManagedLinksRepo.page', () => {
  it('past the last page: no rows with the real total', async () => {
    const fake = fakeDb({ [T]: pastEnd(3) });
    const query = shortLinkListQuerySchema.parse({ page: '4', pageSize: '10' });
    expect(await new ManagedLinksRepo(fake.db).page({ query, owner: null })).toEqual({
      rows: [],
      total: 3,
    });
    expect(rangesOn(fake, T)).toEqual([
      [30, 39],
      [0, 0],
    ]);
  });

  it('newest first, then the id so equal times keep their page', async () => {
    const fake = fakeDb({ [T]: [{ data: [], count: 0 }] });
    const query = shortLinkListQuerySchema.parse({});
    await new ManagedLinksRepo(fake.db).page({ query, owner: null });
    expect(fake.calls.filter((c) => c.method === 'order').map((c) => c.args)).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });
});
