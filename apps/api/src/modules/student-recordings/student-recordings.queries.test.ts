import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { dayBounds } from './student-recordings.mapper';
import { StudentRecordingQueries } from './student-recordings.queries';
import { joinRow, STUDENT } from './student-recordings.fakes';

const eqs = (f: ReturnType<typeof fakeDb>) => f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
const query = { page: 3, pageSize: 10 };

describe('StudentRecordingQueries.page', () => {
  it('joins through lesson_students for this student, newest first, one page of the range', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [joinRow()], count: 31 }] });
    const out = await new StudentRecordingQueries(f.db).page({ studentId: STUDENT, onlyTeacherId: null, query });
    expect(out).toEqual({ rows: [joinRow()], total: 31 });
    expect(eqs(f)).toEqual([['lessons.lesson_students.student_id', STUDENT]]);
    expect(f.argsOf('lesson_recordings', 'order')).toEqual(['started_at', { ascending: false }]);
    expect(f.argsOf('lesson_recordings', 'range')).toEqual([20, 29]);
  });

  it('a teacher without the assignment is limited to their own lessons; filters narrow it further', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [] }] });
    const q = { ...query, from: '2026-10-01', to: '2026-10-31', teacherId: 'T2' };
    await new StudentRecordingQueries(f.db).page({ studentId: STUDENT, onlyTeacherId: 'T1', query: q });
    expect(eqs(f)).toEqual([['lessons.lesson_students.student_id', STUDENT], ['lessons.teacher_id', 'T1'], ['lessons.teacher_id', 'T2']]);
    expect(f.argsOf('lesson_recordings', 'gte')).toEqual(['lessons.starts_at', '2026-10-01T00:00:00.000Z']);
    expect(f.argsOf('lesson_recordings', 'lt')).toEqual(['lessons.starts_at', '2026-11-01T00:00:00.000Z']);
  });

  it('the guardian view adds visible + finished + not deleted', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [] }] });
    await new StudentRecordingQueries(f.db).page({ studentId: STUDENT, onlyTeacherId: null, guardianView: true, query });
    expect(eqs(f)).toEqual([['lessons.lesson_students.student_id', STUDENT], ['visible_to_student', true], ['status', 'done']]);
    expect(f.argsOf('lesson_recordings', 'is')).toEqual(['deleted_at', null]);
  });
});

describe('dayBounds', () => {
  it('is [from 00:00, day after to 00:00) in UTC; open ends stay null', () => {
    expect(dayBounds({ from: '2026-12-31', to: '2026-12-31' })).toEqual({ gte: '2026-12-31T00:00:00.000Z', lt: '2027-01-01T00:00:00.000Z' });
    expect(dayBounds({})).toEqual({ gte: null, lt: null });
  });
});
