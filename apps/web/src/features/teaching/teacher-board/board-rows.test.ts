import type { TeacherMe } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { boardRows } from './board-rows';

const student = (id: string, status: TeacherMe['students'][number]['status']) => ({
  id,
  code: `AB-${id}`,
  name: id,
  tz: 'Africa/Cairo',
  status,
});
const STUDENTS = [student('s-1', 'active'), student('s-2', 'trial'), student('s-3', 'paused')];
const now = new Date('2026-10-05T12:00:00.000Z');
const LESSONS = [
  lesson({ id: 'a', starts_at: '2026-10-01T13:00:00.000Z', status: 'completed', students: [{ ...SUHAILA, attendance: 'on_time' }] }),
  lesson({ id: 'b', starts_at: '2026-10-03T13:00:00.000Z', status: 'no_show' }),
  lesson({ id: 'c', starts_at: '2026-10-07T13:00:00.000Z' }),
];

const firstRow = (kind: 'active' | 'trial') => {
  const [row] = boardRows(STUDENTS, { lessons: LESSONS, kind, now });
  if (!row) throw new Error(`no ${kind} row`);
  return row;
};

describe('boardRows (docs/46 C1)', () => {
  it('current students only (never paused), by kind', () => {
    const ids = (kind: 'all' | 'active' | 'trial') =>
      boardRows(STUDENTS, { lessons: LESSONS, kind, now }).map((r) => r.student.id);
    expect(ids('all')).toEqual(['s-1', 's-2']);
    expect(ids('active')).toEqual(['s-1']);
    expect(ids('trial')).toEqual(['s-2']);
  });

  it('groups the lessons by student: last, next, counts and rate', () => {
    const row = firstRow('active');
    expect(row.summary.lessons.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect([row.summary.last, row.summary.next].map((l) => l?.id)).toEqual(['b', 'c']);
    expect(row.summary.counts).toMatchObject({ present: 1, absent: 1 });
    expect(row.rate).toBe(50);
  });

  it('a student with no lessons: nothing and no rate', () => {
    const row = firstRow('trial');
    expect(row.summary.lessons).toEqual([]);
    expect(row.rate).toBeNull();
  });
});
