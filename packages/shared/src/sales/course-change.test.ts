import { describe, expect, it } from 'vitest';
import { countsTowardCourse, courseRemaining, type CourseLessonFact } from './course-change.js';

const lesson = (o: Partial<CourseLessonFact> = {}): CourseLessonFact => ({
  status: 'completed',
  chargeable: true,
  makeup: false,
  instant: false,
  ...o,
});

describe('countsTowardCourse', () => {
  it.each(['completed', 'late', 'no_show', 'excused', 'scheduled', 'confirmed'] as const)('%s counts', (status) => {
    expect(countsTowardCourse(lesson({ status }))).toBe(true);
  });
  it.each(['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'] as const)('%s gives its place back', (status) => {
    expect(countsTowardCourse(lesson({ status }))).toBe(false);
  });
  it('a lesson not chargeable (e.g. an excused one with notice) does not count', () => {
    expect(countsTowardCourse(lesson({ status: 'excused', chargeable: false }))).toBe(false);
  });
  it('a makeup or an instant lesson never counts', () => {
    expect(countsTowardCourse(lesson({ makeup: true }))).toBe(false);
    expect(countsTowardCourse(lesson({ instant: true }))).toBe(false);
  });
});

describe('courseRemaining', () => {
  it('lessons_total minus the counted lessons before the change point', () => {
    const before = [
      lesson(),
      lesson({ status: 'no_show' }),
      lesson({ status: 'cancelled_by_teacher' }),
      lesson({ status: 'excused', chargeable: false }),
      lesson({ status: 'scheduled' }),
    ];
    expect(courseRemaining(8, before)).toBe(5);
  });
  it('nothing before → the whole course', () => {
    expect(courseRemaining(12, [])).toBe(12);
  });
  it('all used → 0 (course_finished)', () => {
    expect(courseRemaining(2, [lesson(), lesson()])).toBe(0);
  });
});
