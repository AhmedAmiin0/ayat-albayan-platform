import { describe, expect, it } from 'vitest';
import { bookingRequestSchema } from './scheduling.js';

const base = {
  teacherId: '11111111-1111-4111-8111-111111111111',
  studentIds: ['22222222-2222-4222-8222-222222222222'],
  byday: [0, 2],
  startTimeLocal: '17:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-18',
  package: '8',
};
const issues = (body: object) => {
  const r = bookingRequestSchema.safeParse(body);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('bookingRequestSchema dayTimes', () => {
  it('absent is the body old clients send', () => expect(issues(base)).toEqual([]));
  it('a package day with its own time passes', () => {
    expect(issues({ ...base, dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }] })).toEqual([]);
  });
  it('a day that is not in byday', () => {
    expect(issues({ ...base, dayTimes: [{ weekday: 3, startTimeLocal: '19:30' }] })).toContain('day_not_in_byday');
  });
  it('the same day twice', () => {
    const twice = [{ weekday: 2, startTimeLocal: '19:30' }, { weekday: 2, startTimeLocal: '20:00' }];
    expect(issues({ ...base, dayTimes: twice })).toContain('duplicate_day');
  });
  it('a trial is one lesson at one time', () => {
    const trial = { ...base, package: 'trial', byday: [2], dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }] };
    expect(issues(trial)).toContain('package_only');
  });
  it('a free-text time is refused (rule 6)', () => {
    expect(issues({ ...base, dayTimes: [{ weekday: 2, startTimeLocal: '7:30pm' }] }).length).toBeGreaterThan(0);
  });
  it('more than 7 days', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ weekday: i % 7, startTimeLocal: '19:30' }));
    expect(issues({ ...base, byday: [0, 1, 2, 3, 4, 5, 6], dayTimes: many }).length).toBeGreaterThan(0);
  });
});
