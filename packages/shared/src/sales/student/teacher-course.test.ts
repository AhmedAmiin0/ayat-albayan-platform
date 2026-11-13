import { describe, expect, it } from 'vitest';
import { courseEndOf, type TeacherCourseView } from './teacher-course.js';

const base: TeacherCourseView = {
  starts_on: '2026-10-01',
  stopped_at: null,
  ended_at: null,
  projected_end_at: null,
  lessons_total: 8,
  lessons_used: 3,
  lessons_remaining: 5,
};
const STOP = '2026-11-01T10:00:00.000Z';
const END = '2026-11-02T10:00:00.000Z';
const PROJ = '2026-11-20T10:00:00.000Z';

describe('courseEndOf', () => {
  it('a stop wins over everything', () => {
    const c = { ...base, stopped_at: STOP, ended_at: END, projected_end_at: PROJ };
    expect(courseEndOf(c)).toEqual({ key: 'stopped', at: STOP });
  });
  it('an end wins over a booked last lesson', () => {
    expect(courseEndOf({ ...base, ended_at: END, projected_end_at: PROJ })).toEqual({ key: 'ended', at: END });
  });
  it('a booked last lesson wins over the count', () => {
    expect(courseEndOf({ ...base, projected_end_at: PROJ })).toEqual({ key: 'expected', at: PROJ });
  });
  it('else the lessons left', () => {
    expect(courseEndOf(base)).toEqual({ key: 'after', n: 5 });
  });
  it('nothing known: unknown', () => {
    expect(courseEndOf({ ...base, lessons_remaining: 0 })).toEqual({ key: 'unknown' });
  });
});
