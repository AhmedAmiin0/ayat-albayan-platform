import { describe, expect, it } from 'vitest';
import { continueFits, courseBodyPackage, courseDaysPerWeek, courseOpensOn } from './course.js';

describe('courseDaysPerWeek', () => {
  it.each([
    ['4', 1],
    ['8', 2],
    ['12', 3],
    ['16', 4],
    ['20', 5],
    ['28', 7],
  ] as const)('package %s → %i days a week', (pkg, n) => {
    expect(courseDaysPerWeek({ package: pkg, lessons_total: Number(pkg) })).toBe(n);
  });
  it('a custom count divisible by 4 → lessons / 4', () => {
    expect(courseDaysPerWeek({ package: null, lessons_total: 24 })).toBe(6);
  });
  it('a custom count the admin books (not by 4, or more than 7 a week)', () => {
    expect(courseDaysPerWeek({ package: null, lessons_total: 10 })).toBeNull();
    expect(courseDaysPerWeek({ package: null, lessons_total: 32 })).toBeNull();
  });
});

describe('courseBodyPackage', () => {
  it('the subscription’s package, or a paid size the schema accepts for a custom count', () => {
    expect(courseBodyPackage({ package: '12' })).toBe('12');
    expect(courseBodyPackage({ package: null })).toBe('8');
  });
});

describe('courseOpensOn', () => {
  const subscription = { id: 's', package: '8' as const, duration: 45 as const, lessons_total: 8, starts_on: '2026-11-01' };
  const previous = {
    subscriptionId: 'p',
    teacherId: 't',
    teacherTz: 'Asia/Riyadh',
    startsOn: '2026-10-18',
    durationMin: 45 as const,
    tz: 'Asia/Riyadh',
    endsOn: '2026-11-15',
    days: [],
    lessonsTotal: 8,
    perWeek: 2,
  };
  const student = { id: 'st', code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran' as const, teacher_gender_pref: null, teacher_id: null };
  it('the subscription start without a previous course', () => {
    expect(courseOpensOn({ subscription, previous: null, student })).toBe('2026-11-01');
  });
  it('the day after the previous course when that is later', () => {
    expect(courseOpensOn({ subscription, previous, student })).toBe('2026-11-16');
  });
  it('null without a subscription', () => {
    expect(courseOpensOn({ subscription: null, student })).toBeNull();
  });
  it('never before today in the family zone (a previous course that ended weeks ago)', () => {
    const old = { ...previous, endsOn: '2026-09-01' };
    const sub = { ...subscription, starts_on: '2026-09-01' };
    // 2026-10-18T22:30Z is already the 19th in Riyadh.
    expect(courseOpensOn({ subscription: sub, previous: old, student }, '2026-10-18T22:30:00.000Z')).toBe('2026-10-19');
    expect(courseOpensOn({ subscription, previous, student }, '2026-10-18T08:00:00.000Z')).toBe('2026-11-16');
  });
});

describe('continueFits', () => {
  const day = (weekday: number) => ({ weekday, startTimeLocal: '17:00' });
  const previous = { days: [day(0), day(2)] } as unknown as Parameters<typeof continueFits>[0]['previous'];
  it('only when the previous course had exactly the new plan’s days a week', () => {
    expect(continueFits({ previous, perWeek: 2 })).toBe(true);
    expect(continueFits({ previous, perWeek: 3 })).toBe(false);
    expect(continueFits({ previous, perWeek: null })).toBe(false);
    expect(continueFits({ previous: null, perWeek: 2 })).toBe(false);
  });
});
