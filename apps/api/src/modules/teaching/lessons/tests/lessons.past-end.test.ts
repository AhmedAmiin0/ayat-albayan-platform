import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { STUDENT_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsRepo } from '@/modules/teaching/lessons/lessons.repo';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { readerOf } from '@/common/settings/settings.fakes';

describe('LessonsRepo.studentPage past the last page', () => {
  it('answers an empty page with the real total and reads no lesson rows', async () => {
    const fake = fakeDb({ lessons: pastEnd(7) });
    const repo = new LessonsRepo(fake.db, readerOf(LessonsSettings));
    const page = await repo.studentPage(STUDENT_ID, { page: 3, pageSize: 10 });
    expect(page).toEqual({ items: [], total: 7, page: 3, pageSize: 10 });
    expect(rangesOn(fake, 'lessons')).toEqual([[20, 29], [0, 0]]);
    expect(fake.trips).toEqual(['lessons', 'lessons']);
  });
});
