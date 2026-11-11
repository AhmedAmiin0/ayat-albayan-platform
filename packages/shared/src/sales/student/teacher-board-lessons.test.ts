import { describe, expect, it } from 'vitest';
import type { LessonStatus, Attendance } from '@ab/catalog';
import type { LessonView } from '@ab/schedule';
import { lessonsOfStudent, studentLessons } from './teacher-board-lessons.js';

interface Spec {
  id: string;
  at: string;
  status?: LessonStatus;
  attendance?: Attendance | null;
  students?: string[];
  report?: boolean;
}

const lesson = ({ id, at, status = 'scheduled', attendance = null, students = ['s1'], report }: Spec) =>
  ({
    id,
    starts_at: at,
    status,
    students: students.map((sid) => ({
      id: sid,
      attendance,
      report: report ? { id: `r-${id}`, status: 'submitted' } : null,
    })),
  }) as unknown as LessonView;

const now = new Date('2026-11-11T12:00:00Z');

describe('studentLessons', () => {
  const lessons = [
    lesson({ id: 'b', at: '2026-11-09T10:00:00Z', status: 'completed', attendance: 'on_time', report: true }),
    lesson({ id: 'a', at: '2026-11-02T10:00:00Z', status: 'no_show' }),
    lesson({ id: 'c', at: '2026-11-10T10:00:00Z', status: 'completed' }),
    lesson({ id: 'x', at: '2026-11-12T10:00:00Z', students: ['s2'] }),
    lesson({ id: 'd', at: '2026-11-13T10:00:00Z', status: 'cancelled_by_teacher' }),
    lesson({ id: 'e', at: '2026-11-14T10:00:00Z' }),
  ];

  it('groups by lesson.students[].id, oldest first', () => {
    expect(lessonsOfStudent(lessons, 's1').map((l) => l.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(lessonsOfStudent(lessons, 's2').map((l) => l.id)).toEqual(['x']);
  });

  it('last started, next open, newest report, counts of the started lessons', () => {
    const out = studentLessons(lessons, { studentId: 's1', now });
    expect(out.last?.id).toBe('c');
    expect(out.next?.id).toBe('e');
    expect(out.report).toEqual({ lessonId: 'b', status: 'submitted' });
    expect(out.counts).toEqual({ present: 1, absent: 1, excused: 0, cancelled: 0, unmarked: 1 });
  });

  it('a lesson moved away (rescheduled) is never «آخر حلقة», but stays in the drawer', () => {
    const moved = lesson({ id: 'm', at: '2026-11-11T09:00:00Z', status: 'rescheduled' });
    const out = studentLessons([...lessons, moved], { studentId: 's1', now });
    expect(out.last?.id).toBe('c');
    expect(out.lessons.map((l) => l.id)).toContain('m');
  });

  it('nothing for a student without lessons', () => {
    const out = studentLessons(lessons, { studentId: 'none', now });
    expect(out).toMatchObject({ lessons: [], last: null, next: null, report: null });
  });
});
