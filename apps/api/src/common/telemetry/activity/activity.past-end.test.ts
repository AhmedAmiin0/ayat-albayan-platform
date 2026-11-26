import { activityListQuery } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { ActivityRepo } from './activity.repo';

const T = 'v_activity_log';

describe('ActivityRepo.list past the last page', () => {
  it('answers an empty page with the real total', async () => {
    const fake = fakeDb({ [T]: pastEnd(7) });
    const page = await new ActivityRepo(fake.db).list(activityListQuery.parse({ page: '9' }));
    expect(page).toEqual({ items: [], total: 7, page: 9, pageSize: 25 });
    expect(rangesOn(fake, T)).toEqual([[200, 224], [0, 0]]);
  });
});
