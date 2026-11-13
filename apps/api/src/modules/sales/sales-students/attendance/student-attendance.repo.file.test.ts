import { COUNTS_FOR_MONEY } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { StudentAttendanceRepo } from './student-attendance.repo';

const MONEY = /price|amount|paid|payment|invoice|renews_on|currency|\*/;
const methodArgs = (f: ReturnType<typeof fakeDb>, method: string) =>
  f.calls.filter((c) => c.method === method).map((c) => c.args);

describe('StudentAttendanceRepo — the teacher file reads (docs/47)', () => {
  it('student: id, code, name and status only; null for an unknown id', async () => {
    const head = { id: 's1', code: 'AB-0001', name: 'س', status: 'active' };
    const f = fakeDb({ students: [{ data: head }, { data: null }] });
    const repo = new StudentAttendanceRepo(f.db);
    expect(await repo.student('s1')).toEqual(head);
    expect(await repo.student('nope')).toBeNull();
    expect(f.argsOf('students', 'select')).toEqual(['id, code, name, status']);
    expect(f.argsOf('students', 'eq')).toEqual(['id', 's1']);
  });

  it('taughtBy: her lessons with the student, taught statuses only, since, one row', async () => {
    const f = fakeDb({ lessons: [{ data: [{ id: 'l1' }] }, { data: [] }] });
    const repo = new StudentAttendanceRepo(f.db);
    const since = new Date('2026-08-01T00:00:00Z');
    expect(await repo.taughtBy({ teacherId: 't1', studentId: 's1', since })).toBe(true);
    expect(await repo.taughtBy({ teacherId: 't1', studentId: 's1', since })).toBe(false);
    expect(f.argsOf('lessons', 'select')).toEqual(['id, own:lesson_students!inner(student_id)']);
    expect(methodArgs(f, 'eq').slice(0, 2)).toEqual([['own.student_id', 's1'], ['teacher_id', 't1']]);
    const statuses = ['scheduled', 'confirmed', 'completed', 'late', 'no_show'];
    expect(f.argsOf('lessons', 'in')).toEqual(['status', statuses]);
    expect(f.argsOf('lessons', 'gte')).toEqual(['starts_at', since.toISOString()]);
    expect(f.argsOf('lessons', 'limit')).toEqual([1]);
  });

  it('packages: the ones that count, newest first; dates and size, never money', async () => {
    const f = fakeDb({ subscriptions: [{ data: [] }] });
    expect(await new StudentAttendanceRepo(f.db).packages('s1')).toEqual([]);
    const select = String(f.argsOf('subscriptions', 'select')?.[0]);
    expect(select).toBe('id, starts_on, created_at, status, cancel_kind, cancelled_at, lessons_total');
    expect(select).not.toMatch(MONEY);
    expect(f.argsOf('subscriptions', 'eq')).toEqual(['student_id', 's1']);
    expect(f.argsOf('subscriptions', 'or')).toEqual([COUNTS_FOR_MONEY]);
    expect(methodArgs(f, 'order')).toEqual([
      ['starts_on', { ascending: false }],
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ subscriptions: [{ error: { message: 'boom' } }] });
    await expect(new StudentAttendanceRepo(f.db).packages('s1')).rejects.toThrow(/boom/);
  });
});
