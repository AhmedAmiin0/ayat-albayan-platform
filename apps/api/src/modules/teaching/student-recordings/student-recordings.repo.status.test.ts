import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { StudentRecordingRepo } from './student-recordings.repo';
import { STUDENT } from './student-recordings.fakes';

describe('StudentRecordingRepo.page status filter', () => {
  it('narrows the page to one state', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [] }] });
    const query = { page: 1, pageSize: 10, status: 'failed' as const };
    await new StudentRecordingRepo(f.db).page({ studentId: STUDENT, onlyTeacherId: null, query });
    const eqs = f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toContainEqual(['status', 'failed']);
  });
});
