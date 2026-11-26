import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { fakePhotos } from '@/common/storage/avatars/avatars.fakes';
import { TeachersRepo } from './teachers.repo';

describe('TeachersRepo.list past the last page', () => {
  it('answers an empty page with the real total', async () => {
    const fake = fakeDb({ teachers: pastEnd(6) });
    const repo = new TeachersRepo(fake.db, fakePhotos().photos);
    const page = await repo.list({ page: 2, pageSize: 25 });
    expect(page).toEqual({ items: [], total: 6, page: 2, pageSize: 25 });
    expect(rangesOn(fake, 'teachers')).toEqual([[25, 49], [0, 0]]);
  });
});
