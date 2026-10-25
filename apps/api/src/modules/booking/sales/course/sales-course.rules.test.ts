import type { CourseSubscription } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { courseBlock, courseOverlaps, courseProblem, isCourseRule, type CourseFacts, type CourseRule } from './sales-course.rules';

const SUB: CourseSubscription = { id: 'sub1', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-10' };
const REQ: CourseFacts['req'] = { durationMin: 45, startsOn: '2026-10-11', byday: [0, 2] };
const facts = (over: Partial<CourseFacts> = {}): CourseFacts => ({ req: REQ, sub: SUB, rules: [], endsOn: '2026-11-03', booked: false, ...over });
const rule = (over: Partial<CourseRule> = {}): CourseRule => ({ starts_on: '2026-09-01', ends_on: null, package: '8', ...over });
const result = (over: Partial<CourseFacts> = {}) => courseProblem(facts(over));

describe('courseProblem — what the assistant may book for her subscription (owner 2026-10-18)', () => {
  it('the plan’s days a week, duration and package from the subscription’s start: null', () => {
    expect(result()).toBeNull();
    expect(result({ req: { ...REQ, startsOn: '2026-10-10' } })).toBeNull();
  });

  it('409 subscription_required without an unpaid or active subscription', () => {
    expect(result({ sub: null })).toEqual({ status: 409, code: 'subscription_required' });
  });

  it('400 course_mismatch: another duration (the package is the subscription’s whatever is sent, review M4)', () => {
    expect(result({ req: { ...REQ, durationMin: 60 } })).toEqual({ status: 400, code: 'course_mismatch' });
  });

  it('a custom count of 24 lessons is 6 days a week, bookable by the assistant', () => {
    const custom = { ...SUB, package: null, lessons_total: 24 };
    expect(result({ sub: custom, req: { ...REQ, byday: [0, 1, 2, 3, 4, 5] } })).toBeNull();
  });

  it('409 course_exists once the subscription has its course, even ended (review M3)', () => {
    expect(result({ booked: true })).toEqual({ status: 409, code: 'course_exists' });
  });

  it('400 no_occurrences when a picked day has no lesson (no course end)', () => {
    expect(result({ endsOn: null })).toEqual({ status: 400, code: 'no_occurrences' });
  });

  it('400 starts_before_subscription', () => {
    expect(result({ req: { ...REQ, startsOn: '2026-10-09' } })).toEqual({ status: 400, code: 'starts_before_subscription' });
  });

  it('400 days_count_mismatch: 8 lessons = exactly 2 days a week', () => {
    expect(result({ req: { ...REQ, byday: [0] } })).toEqual({ status: 400, code: 'days_count_mismatch' });
    expect(result({ req: { ...REQ, byday: [0, 2, 4] } })).toEqual({ status: 400, code: 'days_count_mismatch' });
  });

  it('409 custom_count_admin: a lesson count with no whole days a week is the admin’s', () => {
    expect(result({ sub: { ...SUB, package: null, lessons_total: 10 } })).toEqual({ status: 409, code: 'custom_count_admin' });
  });

  it('409 course_exists: a weekly course of the student overlaps the new one', () => {
    expect(result({ rules: [rule()] })).toEqual({ status: 409, code: 'course_exists' });
    expect(result({ rules: [rule({ starts_on: '2026-11-01', ends_on: '2026-12-01' })] })).toEqual({ status: 409, code: 'course_exists' });
  });

  it('a course that ended before, or starts after the new one’s last day, a trial and a one-day rule do not block', () => {
    const rules = [
      rule({ ends_on: '2026-10-10' }),
      rule({ starts_on: '2026-11-04' }),
      rule({ package: 'trial', ends_on: null }),
      rule({ starts_on: '2026-10-13', ends_on: '2026-10-13', package: null }),
    ];
    expect(result({ rules })).toBeNull();
  });
});

describe('isCourseRule / courseOverlaps', () => {
  it('an imported rule with no package is a course; a makeup (one day) is not', () => {
    expect(isCourseRule(rule({ package: null }))).toBe(true);
    expect(isCourseRule(rule({ starts_on: '2026-10-13', ends_on: '2026-10-13' }))).toBe(false);
  });

  it('an open span overlaps every course that has not ended before it', () => {
    expect(courseOverlaps([rule({ starts_on: '2027-01-01' })], { from: '2026-10-18', to: null })).toBe(true);
    expect(courseOverlaps([rule({ ends_on: '2026-10-17' })], { from: '2026-10-18', to: null })).toBe(false);
  });
});

describe('courseBlock — the wizard’s gate (GET /sales/booking/course)', () => {
  const today = '2026-10-18';
  it('subscription_required, then custom_count_admin, then course_exists; else null', () => {
    expect(courseBlock({ sub: null, rules: [rule()], today, booked: false })).toBe('subscription_required');
    expect(courseBlock({ sub: { ...SUB, package: null, lessons_total: 6 }, rules: [rule()], today, booked: false })).toBe('custom_count_admin');
    expect(courseBlock({ sub: SUB, rules: [rule({ ends_on: today })], today, booked: false })).toBe('course_exists');
    expect(courseBlock({ sub: SUB, rules: [rule({ ends_on: '2026-10-17' })], today, booked: false })).toBeNull();
    expect(courseBlock({ sub: SUB, rules: [], today, booked: true })).toBe('course_exists');
  });
});
