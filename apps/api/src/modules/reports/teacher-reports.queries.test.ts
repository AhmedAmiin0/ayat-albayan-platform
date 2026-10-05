import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { TeacherReportsQueries } from './teacher-reports.queries';

const T = 'lesson_reports';
const PAGE = { page: 2, pageSize: 10 };
type Call = { table: string; method: string; args: unknown[] };
const argsOf = (calls: Call[], table: string, method: string) => calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

describe('TeacherReportsQueries.page (R-REP-02, R-NFR-08)', () => {
  it('no sort: my submitted reports, newest submit first, then id; windowed', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [], count: 0 }] });
    await new TeacherReportsQueries(db).page({ teacherId: 't1', page: PAGE });
    expect(argsOf(calls, T, 'eq')).toEqual([['teacher_id', 't1'], ['status', 'submitted']]);
    expect(argsOf(calls, T, 'order')).toEqual([['submitted_at', { ascending: false }], ['id']]);
    expect(argsOf(calls, T, 'range')).toEqual([[10, 19]]);
  });

  it('grade order (empty last) with attendance and grade filters', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [], count: 0 }] });
    await new TeacherReportsQueries(db).page({
      teacherId: 't1',
      filter: { sort: 'grade', dir: 'desc', attendance: 'late', grade: 'good' },
      page: PAGE,
    });
    expect(argsOf(calls, T, 'eq').slice(2)).toEqual([['attendance', 'late'], ['grade_overall', 'good']]);
    expect(argsOf(calls, T, 'order')).toEqual([
      ['grade_overall', { ascending: false, nullsFirst: false }],
      ['submitted_at', { ascending: false }],
      ['id'],
    ]);
  });

  it('student: the matching ids first; nobody matching is an empty page without a reports read', async () => {
    const hit = fakeDb({ students: [{ data: [{ id: 's1' }] }], [T]: [{ data: [], count: 0 }] });
    await new TeacherReportsQueries(hit.db).page({ teacherId: 't1', filter: { student: 'AB-0183' }, page: PAGE });
    expect(argsOf(hit.calls, T, 'in')).toEqual([['student_id', ['s1']]]);

    const none = fakeDb({ students: [{ data: [] }] });
    expect(await new TeacherReportsQueries(none.db).page({ teacherId: 't1', filter: { student: 'x' }, page: PAGE })).toEqual({ rows: [], total: 0 });
    expect(none.calls.some((c) => c.table === T)).toBe(false);
  });
});
