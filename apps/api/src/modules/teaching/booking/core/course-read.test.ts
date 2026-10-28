import { describe, expect, it } from 'vitest';
import { bookedCourse, courseFacts, currentCourse, studentCourses, type CourseRuleRow } from './course-read';

/** 12:00 Riyadh on Sunday 18 Oct 2026. */
const NOW = new Date('2026-10-18T09:00:00Z');
const at = (day: string) => new Date(`${day}T09:00:00Z`);
const plan8 = { package: '8' as const, lessons_total: 8 };
const rule = (o: Partial<CourseRuleRow> = {}): CourseRuleRow => ({
  id: 'r1',
  subscription_id: 'sub1',
  teacher_id: 't1',
  duration_min: 45,
  start_time_local: '17:00:00',
  tz: 'Asia/Riyadh',
  byday: [0],
  starts_on: '2026-10-18',
  ends_on: '2026-11-10',
  status: 'active',
  first_rule_id: null,
  sub: plan8,
  teacher: { tz: 'Africa/Cairo' },
  ...o,
});

describe('bookedCourse — a course from its rules (owner 2026-10-18)', () => {
  it('each weekday with its own time, the first rule leading, the plan of the subscription', () => {
    const rows = [rule(), rule({ id: 'r2', byday: [2], start_time_local: '19:30:00', first_rule_id: 'r1' })];
    expect(bookedCourse(rows, NOW)).toEqual({
      subscriptionId: 'sub1',
      teacherId: 't1',
      teacherTz: 'Africa/Cairo',
      durationMin: 45,
      tz: 'Asia/Riyadh',
      startsOn: '2026-10-18',
      endsOn: '2026-11-10',
      running: true,
      opensOn: '2026-10-18',
      days: [
        { weekday: 0, startTimeLocal: '17:00' },
        { weekday: 2, startTimeLocal: '19:30' },
      ],
      lessonsTotal: 8,
      perWeek: 2,
    });
  });
  it('lessons used before the platform (owner 2026-10-28): the course carries the rest; days a week stay the plan\'s', () => {
    const course = bookedCourse([rule({ sub: { ...plan8, lessons_used_before: 1 } })], NOW);
    expect(course).toMatchObject({ lessonsTotal: 7, perWeek: 2 });
  });
  it('a rescheduled rule (ended earlier) is not one of its days: only the latest set', () => {
    const rows = [
      rule({ id: 'old', byday: [1], ends_on: '2026-10-25', status: 'ended' }),
      rule({ id: 'new', byday: [3], start_time_local: '18:00:00' }),
    ];
    expect(bookedCourse(rows, NOW)?.days).toEqual([{ weekday: 3, startTimeLocal: '18:00' }]);
  });
  it('booked ahead + pending change: opensOn is the old rules\' first day, before the new set (startsOn)', () => {
    // A renewal from Sun 8 Nov, Sunday swapped for Monday from Mon 9 Nov before it starts: Sun 8 stays.
    const rows = [
      rule({ id: 'sun', starts_on: '2026-11-08', ends_on: '2026-11-08' }),
      rule({ id: 'mon', byday: [1], starts_on: '2026-11-09', ends_on: '2026-12-07' }),
      rule({ id: 'gone', byday: [3], starts_on: '2026-11-04', ends_on: '2026-11-30', status: 'ended' }),
    ];
    const course = bookedCourse(rows, NOW);
    expect(course).toMatchObject({ startsOn: '2026-11-09', opensOn: '2026-11-08', running: false });
    expect(bookedCourse(rows, at('2026-11-09'))?.opensOn).toBe('2026-11-09');
  });
  it('no capped rule → null', () => {
    expect(bookedCourse([rule({ ends_on: null })], NOW)).toBeNull();
  });
});

describe('courseFacts — previous (a renewal) and current (still running)', () => {
  const old = rule({ subscription_id: 'old', ends_on: '2026-10-25', sub: plan8 });
  const older = rule({ id: 'r0', subscription_id: 'older', ends_on: '2026-09-20', status: 'ended' });

  it('the newest subscription has no course yet → the latest course of another subscription', () => {
    const facts = courseFacts({ rows: [older, old], now: NOW, subscriptionId: 'new', booked: false });
    expect(facts.previous?.subscriptionId).toBe('old');
    expect(facts.current?.subscriptionId).toBe('old');
  });
  it('the newest subscription already has its course → no previous', () => {
    const own = rule({ id: 'r9', subscription_id: 'new', ends_on: '2026-12-01' });
    const facts = courseFacts({ rows: [old, own], now: NOW, subscriptionId: 'new', booked: true });
    expect(facts.previous).toBeNull();
    expect(facts.current?.subscriptionId).toBe('new');
  });
  it('no subscription to book → no previous; a course that ended is not current', () => {
    const facts = courseFacts({ rows: [older], now: NOW, subscriptionId: null, booked: false });
    expect(facts).toEqual({ previous: null, current: null });
  });
  it('studentCourses: the latest-ending first', () => {
    expect(studentCourses([older, old], NOW).map((c) => c.subscriptionId)).toEqual(['old', 'older']);
  });
});

describe('currentCourse — the course «تغيير أيام الحلقات» changes (review fix 5)', () => {
  const running = rule({ subscription_id: 'old', starts_on: '2026-09-20', ends_on: '2026-11-03' });
  const renewal = rule({ id: 'r5', subscription_id: 'new', starts_on: '2026-11-08', ends_on: '2026-12-01' });
  const later = rule({ id: 'r6', subscription_id: 'later', starts_on: '2026-12-06', ends_on: '2027-01-01' });
  const current = (rows: CourseRuleRow[], today: string) => currentCourse(rows, studentCourses(rows, at(today)), at(today))?.subscriptionId;

  it('a renewal booked ahead never hides the course running today', () => {
    expect(current([running, renewal], '2026-10-18')).toBe('old');
    expect(courseFacts({ rows: [running, renewal], now: NOW, subscriptionId: 'new', booked: true }).current?.subscriptionId).toBe('old');
  });
  it('nothing running today → the earliest-starting upcoming course', () => {
    expect(current([later, renewal, rule({ ...running, ends_on: '2026-10-10', status: 'ended' })], '2026-10-18')).toBe('new');
  });
  it('an ended or paused course is never current', () => {
    expect(current([rule({ ...running, status: 'paused' })], '2026-10-18')).toBeUndefined();
  });
  it('startsOn is the first day of the latest set of rules', () => {
    expect(bookedCourse([renewal], NOW)?.startsOn).toBe('2026-11-08');
  });
});

describe('running — some active rule covers today in the course zone (review round 2, fix 2)', () => {
  const old = rule({ id: 'old', starts_on: '2026-09-20', ends_on: '2026-11-10' });
  it('a change saved today whose first new lesson is later: the old rules still run this week', () => {
    const changed = [{ ...old, ends_on: '2026-10-21' }, rule({ id: 'new', byday: [3], starts_on: '2026-10-22' })];
    const course = bookedCourse(changed, NOW);
    expect(course?.startsOn).toBe('2026-10-22');
    expect(course?.running).toBe(true);
  });
  it('a course booked ahead, ended or paused is not running', () => {
    expect(bookedCourse([rule({ starts_on: '2026-10-25' })], NOW)?.running).toBe(false);
    expect(bookedCourse([{ ...old, status: 'paused' }], NOW)?.running).toBe(false);
    expect(bookedCourse([{ ...old, ends_on: '2026-10-17' }], NOW)?.running).toBe(false);
  });
  it('today is read in the course zone: 22:00 on the 17th in New York is not yet its first day', () => {
    const ny = rule({ tz: 'America/New_York', starts_on: '2026-10-18' });
    expect(bookedCourse([ny], new Date('2026-10-18T02:00:00Z'))?.running).toBe(false);
    expect(bookedCourse([ny], new Date('2026-10-18T05:00:00Z'))?.running).toBe(true);
  });
});
