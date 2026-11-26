import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { NotificationsRepo } from './notifications.repo';

const T = 'push_notifications';

describe('NotificationsRepo.list past the last page', () => {
  it('answers an empty page with the real total and the unread count', async () => {
    const [missed, total] = pastEnd(12);
    const fake = fakeDb({ [T]: [missed ?? {}, { count: 5 }, total ?? {}] });
    const page = await new NotificationsRepo(fake.db).list('p1', { page: 3, pageSize: 20 });
    expect(page).toEqual({ items: [], total: 12, page: 3, pageSize: 20, unread: 5 });
    expect(rangesOn(fake, T)).toEqual([[40, 59], [0, 0]]);
  });
});
