import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { TeacherReportsQueries } from '@/modules/reporting/reports/teacher/teacher-reports.queries';

const T = 'lesson_reports';

describe('TeacherReportsQueries.page past the last page', () => {
  it('answers no rows with the real total, scoped to the teacher on both reads', async () => {
    const fake = fakeDb({ [T]: pastEnd(3) });
    const page = await new TeacherReportsQueries(fake.db).page({
      teacherId: 't1',
      page: { page: 2, pageSize: 20 },
    });
    expect(page).toEqual({ rows: [], total: 3 });
    expect(rangesOn(fake, T)).toEqual([[20, 39], [0, 0]]);
    const teacherEqs = fake.calls.filter((c) => c.method === 'eq' && c.args[0] === 'teacher_id');
    expect(teacherEqs).toHaveLength(2);
  });
});
