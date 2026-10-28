import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { StudentAttendanceQueries } from './student-attendance.queries';

const SECRET = /meeting|link|notes|price|amount|subscription|\*/;

describe('StudentAttendanceQueries (whitelisted selects)', () => {
  it('lessons: the student\'s lessons in [from, to), newest first; no link, notes or money column', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    const from = new Date('2026-09-30T21:00:00Z');
    const to = new Date('2026-10-28T10:00:00Z');
    await new StudentAttendanceQueries(f.db).lessons('s1', { from, to });
    expect(f.argsOf('lessons', 'eq')).toEqual(['own.student_id', 's1']);
    expect(f.argsOf('lessons', 'gte')).toEqual(['starts_at', from.toISOString()]);
    expect(f.argsOf('lessons', 'lt')).toEqual(['starts_at', to.toISOString()]);
    expect(f.argsOf('lessons', 'order')).toEqual(['starts_at', { ascending: false }]);
    const select = String(f.argsOf('lessons', 'select')?.[0]);
    expect(select).toContain('own:lesson_students!inner(student_id, attendance, chargeable)');
    expect(select).not.toMatch(SECRET);
  });

  it('starts: when each lesson before now started', async () => {
    const f = fakeDb({ lessons: [{ data: [{ starts_at: '2026-10-01T10:00:00Z' }] }] });
    expect(await new StudentAttendanceQueries(f.db).starts('s1', new Date('2026-10-28T10:00:00Z'))).toEqual(['2026-10-01T10:00:00Z']);
    expect(f.argsOf('lessons', 'lt')).toEqual(['starts_at', '2026-10-28T10:00:00.000Z']);
  });

  it('reports: submitted reports of these lessons only (ids, nothing of the content); none asked, none read', async () => {
    const f = fakeDb({ lesson_reports: [{ data: [{ id: 'r1', lesson_id: 'l1' }] }] });
    expect(await new StudentAttendanceQueries(f.db).reports('s1', ['l1'])).toEqual([{ id: 'r1', lesson_id: 'l1' }]);
    expect(f.argsOf('lesson_reports', 'select')).toEqual(['id, lesson_id']);
    expect(f.argsOf('lesson_reports', 'in')).toEqual(['lesson_id', ['l1']]);
    const none = fakeDb({});
    expect(await new StudentAttendanceQueries(none.db).reports('s1', [])).toEqual([]);
    expect(none.calls).toEqual([]);
  });

  it('exists: true for a student row, false without one; a database error becomes an error', async () => {
    expect(await new StudentAttendanceQueries(fakeDb({ students: [{ data: { id: 's1' } }] }).db).exists('s1')).toBe(true);
    expect(await new StudentAttendanceQueries(fakeDb({ students: [{ data: null }] }).db).exists('s1')).toBe(false);
    const broken = fakeDb({ lessons: [{ error: { message: 'boom' } }] });
    await expect(new StudentAttendanceQueries(broken.db).starts('s1', new Date())).rejects.toThrow(/boom/);
  });
});
