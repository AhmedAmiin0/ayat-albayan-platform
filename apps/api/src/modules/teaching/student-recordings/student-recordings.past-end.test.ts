import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { StudentRecordingRepo } from './student-recordings.repo';
import { STUDENT } from './student-recordings.fakes';

const T = 'lesson_recordings';

describe('StudentRecordingRepo.page past the last page', () => {
  it('answers no rows with the real total, newest first then id', async () => {
    const fake = fakeDb({ [T]: pastEnd(4) });
    const input = { studentId: STUDENT, onlyTeacherId: null, query: { page: 2, pageSize: 10 } };
    const page = await new StudentRecordingRepo(fake.db).page(input);
    expect(page).toEqual({ rows: [], total: 4 });
    expect(rangesOn(fake, T)).toEqual([
      [10, 19],
      [0, 0],
    ]);
    const orders = fake.calls.filter((c) => c.table === T && c.method === 'order');
    expect(orders.slice(0, 2).map((c) => c.args)).toEqual([
      ['started_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
  });
});
