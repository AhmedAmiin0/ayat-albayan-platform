import { describe, expect, it } from 'vitest';
import { teacherLessonKind, teacherLessonTotals } from './teacher-overview.js';

describe('teacherLessonKind', () => {
  it.each([
    ['completed', 'held'],
    ['late', 'held'],
    ['no_show', 'student_absent'],
    ['cancelled_by_teacher', 'cancelled_by_teacher'],
    ['cancelled_by_admin', 'cancelled_by_admin'],
    ['excused', 'other'],
    ['scheduled', null],
    ['confirmed', null],
    ['rescheduled', null],
  ] as const)('%s = %s', (status, kind) => {
    expect(teacherLessonKind(status)).toBe(kind);
  });
});

describe('teacherLessonTotals', () => {
  it('counts each closed kind; open and moved lessons are not counted', () => {
    expect(teacherLessonTotals(['completed', 'late', 'no_show', 'cancelled_by_admin', 'excused', 'scheduled', 'rescheduled'])).toEqual({
      held: 2, student_absent: 1, cancelled_by_teacher: 0, cancelled_by_admin: 1, other: 1,
    });
    expect(teacherLessonTotals([])).toEqual({ held: 0, student_absent: 0, cancelled_by_teacher: 0, cancelled_by_admin: 0, other: 0 });
  });
});
