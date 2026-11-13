import { describe, expect, it } from 'vitest';
import type { CoursePackageRow } from '@/modules/sales/sales-students/attendance/student-attendance.rows';
import { courseOf, teacherCourseOf, toTeacherCourse, type CourseBalance } from './teacher-course';

type Over = Partial<CoursePackageRow>;
const pkg = (id: string, starts_on: string, over: Over = {}): CoursePackageRow => ({
  id, starts_on, created_at: `${starts_on}T08:00:00Z`, status: 'active', cancel_kind: null,
  cancelled_at: null, lessons_total: 8, ...over,
});
const bal = (id: string, used: number, over: Partial<CourseBalance> = {}): CourseBalance => ({
  subscription_id: id, lessons_used: used, remaining: 8 - used, ended_at: null,
  projected_end_at: null, ...over,
});
const KEYS = [
  'ended_at', 'lessons_remaining', 'lessons_total', 'lessons_used', 'projected_end_at',
  'starts_on', 'stopped_at',
];

describe('teacherCourseOf (docs/47: the FIFO-running package)', () => {
  it('null without a package', () => {
    expect(teacherCourseOf([], [])).toBeNull();
    expect(courseOf([], [])).toBeNull();
  });

  it('the running older package wins over a newer paid renewal', () => {
    const newestFirst = [pkg('renewal', '2026-11-01'), pkg('running', '2026-10-01')];
    const pick = teacherCourseOf(newestFirst, [bal('renewal', 0), bal('running', 6)]);
    expect(pick?.id).toBe('running');
  });

  it('an unused cancel is excluded', () => {
    const unused = pkg('unused', '2026-11-01', { status: 'cancelled', cancel_kind: 'unused' });
    expect(teacherCourseOf([unused, pkg('old', '2026-09-01')], [bal('old', 8)])?.id).toBe('old');
    expect(teacherCourseOf([unused], [])).toBeNull();
  });

  it('a stopped package with lessons left never wins over a running one', () => {
    const stopped = pkg('stopped', '2026-09-01', { status: 'cancelled', cancel_kind: 'stopped' });
    const pick = teacherCourseOf([pkg('running', '2026-10-01'), stopped], [bal('running', 2)]);
    expect(pick?.id).toBe('running');
  });

  it('everything used up → the newest package, with its end', () => {
    const ended = bal('new', 8, { ended_at: '2026-10-25 15:30:00+00' });
    const course = courseOf([pkg('new', '2026-10-01'), pkg('old', '2026-09-01')], [bal('old', 8), ended]);
    expect(course).toMatchObject({ starts_on: '2026-10-01', ended_at: '2026-10-25T15:30:00.000Z' });
  });
});

describe('toTeacherCourse (the whitelist)', () => {
  it('exact keys: dates and counts only, never id, status, cancel kind or money', () => {
    const withPrice = { ...pkg('p', '2026-10-01'), price: 290, renews_on: '2026-11-01' };
    const view = toTeacherCourse(withPrice, bal('p', 3));
    expect(Object.keys(view ?? {}).sort()).toEqual(KEYS);
    expect(view).toEqual({
      starts_on: '2026-10-01', stopped_at: null, ended_at: null, projected_end_at: null,
      lessons_total: 8, lessons_used: 3, lessons_remaining: 5,
    });
  });

  it('remaining is clamped at 0; no balance row: nothing used yet', () => {
    expect(toTeacherCourse(pkg('p', '2026-10-01'), bal('p', 9, { remaining: -1 }))?.lessons_remaining)
      .toBe(0);
    expect(toTeacherCourse(pkg('p', '2026-10-01'), undefined)).toMatchObject({
      lessons_used: 0, lessons_remaining: 8,
    });
    expect(toTeacherCourse(null, undefined)).toBeNull();
  });

  it('a stopped newest package: stopped_at = cancelled_at', () => {
    const stopped = pkg('s', '2026-10-01', {
      status: 'cancelled', cancel_kind: 'stopped', cancelled_at: '2026-10-20 08:00:00+00',
    });
    expect(courseOf([stopped], [])).toMatchObject({ stopped_at: '2026-10-20T08:00:00.000Z' });
  });

  it('a booked last lesson: projected_end_at as an instant', () => {
    const b = bal('p', 6, { projected_end_at: '2026-11-20 15:00:00+00' });
    expect(toTeacherCourse(pkg('p', '2026-10-01'), b)?.projected_end_at).toBe('2026-11-20T15:00:00.000Z');
  });
});
