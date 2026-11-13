import type { TeacherMe } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { boardRows, searchRows } from './board-rows';

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

describe('boardRows order and searchRows (docs/48)', () => {
  const kid = (id: string, name: string) => ({ ...student(id, 'active'), name });
  const KIDS = [kid('k-1', 'يوسف'), kid('k-2', 'بلال'), kid('k-3', 'آمنة'), kid('k-4', 'تسنيم')];
  const at = (id: string, studentId: string, starts_at: string) =>
    lesson({ id, starts_at, students: [{ ...SUHAILA, id: studentId }] });
  const AHEAD = [
    at('x', 'k-1', '2026-10-09T13:00:00.000Z'),
    at('y', 'k-4', '2026-10-06T13:00:00.000Z'),
  ];
  const rows = () => boardRows(KIDS, { lessons: AHEAD, kind: 'all', now });

  it('soonest next lesson first, no next lesson last, ties by the Arabic name', () => {
    expect(rows().map((r) => r.student.id)).toEqual(['k-4', 'k-1', 'k-3', 'k-2']);
  });

  it('matches the name, the code in any case, and the facts line', () => {
    const facts = new Map([['k-2', 'التجويد · المستوى الأول']]);
    const ids = (q: string) => searchRows(rows(), { q, facts }).map((r) => r.student.id);
    expect(ids('')).toHaveLength(4);
    expect(ids('امنة')).toEqual(['k-3']);
    expect(ids('ab-k-1')).toEqual(['k-1']);
    expect(ids('تجويد')).toEqual(['k-2']);
    expect(ids('زينب')).toEqual([]);
  });
});
