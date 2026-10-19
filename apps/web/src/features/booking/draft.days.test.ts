import { bookingRequestSchema, type BookingTeacherOption } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { courseEnd, dayPicks, days, draftPicks, pickPatch, withPicks } from './draft.days';
import { emptyDraft, stepReady, stepsOf, toBookingRequest, type BookingDraft } from './draft';

const TEACHER: BookingTeacherOption = {
  id: '6f1c2a3e-1b2c-4d5e-8f90-123456789abc',
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  platform_classroom: false,
  students_count: 3,
  max_students: 10,
  has_availability: true,
};
const STUDENT = { id: '0b5e7d1a-2c3d-4e5f-9a8b-7c6d5e4f3a2b', name: 'سهيلة', code: 'AB-0183' };
const SUN_17 = '2026-10-04T14:00:00.000Z'; // Sunday 17:00 Riyadh
const TUE_1930 = '2026-10-06T16:30:00.000Z'; // Tuesday 19:30 Riyadh
const SAT_10 = '2026-10-03T07:00:00.000Z'; // Saturday 10:00 Riyadh

const ready = (o: Partial<BookingDraft> = {}): BookingDraft => ({
  ...emptyDraft(),
  students: [STUDENT],
  tz: 'Asia/Riyadh',
  teacher: TEACHER,
  startsAt: SUN_17,
  ...o,
});

describe('picks of a package (one slot per weekday, each with its time)', () => {
  it('keeps the earliest pick as startsAt, the others in extra', () => {
    expect(withPicks([TUE_1930, SUN_17])).toEqual({ startsAt: SUN_17, extra: [TUE_1930] });
    expect(withPicks([])).toEqual({ startsAt: null, extra: [] });
    expect(draftPicks(ready({ extra: [TUE_1930] }))).toEqual([SUN_17, TUE_1930]);
    expect(draftPicks(ready({ startsAt: null, extra: [TUE_1930] }))).toEqual([]);
  });

  it('tapping adds, a tap on an earlier day moves startsAt, the same slot again removes it', () => {
    const one = ready({ extra: [] });
    const two = { ...one, ...pickPatch(one, TUE_1930) };
    expect(two).toMatchObject({ startsAt: SUN_17, extra: [TUE_1930] });
    expect(pickPatch(two, SAT_10)).toEqual({ startsAt: SAT_10, extra: [SUN_17, TUE_1930] });
    expect(pickPatch(two, SUN_17)).toEqual({ startsAt: TUE_1930, extra: [] });
    expect(pickPatch(ready({ extra: [] }), SUN_17)).toEqual({ startsAt: null, extra: [] });
  });

  it('a trial or a makeup is one lesson: the tap replaces it, extra never counts', () => {
    expect(pickPatch(ready({ kind: 'trial', pkg: 'trial' }), TUE_1930)).toEqual({ startsAt: TUE_1930, extra: [] });
    expect(days(ready({ kind: 'trial', pkg: 'trial', extra: [TUE_1930] }))).toEqual([0]);
    expect(days(ready({ extra: [TUE_1930] }))).toEqual([0, 2]);
    expect(days(ready({ startsAt: null }))).toEqual([]);
  });

  it('lists each day with its time in the family zone, Saturday first', () => {
    expect(dayPicks(ready({ startsAt: SAT_10, extra: [SUN_17, TUE_1930] })).map((p) => [p.weekday, p.time])).toEqual([
      [6, '10:00'],
      [0, '17:00'],
      [2, '19:30'],
    ]);
    expect(dayPicks(ready({ tz: 'Africa/Cairo' }))[0]).toMatchObject({ weekday: 0, time: '17:00' });
  });
});

describe('toBookingRequest with a time per day', () => {
  it('sends the other days whose time differs as dayTimes, and stays valid', () => {
    const body = toBookingRequest(ready({ extra: [TUE_1930] }));
    expect(body).toMatchObject({
      byday: [0, 2],
      startTimeLocal: '17:00',
      startsOn: '2026-10-04',
      startsAt: SUN_17,
      dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
    });
    expect(bookingRequestSchema.safeParse(body).success).toBe(true);
  });

  it('the earliest pick is the first lesson', () => {
    expect(toBookingRequest(ready({ startsAt: SAT_10, extra: [SUN_17] }))).toMatchObject({
      byday: [0, 6],
      startTimeLocal: '10:00',
      startsOn: '2026-10-03',
      startsAt: SAT_10,
      dayTimes: [{ weekday: 0, startTimeLocal: '17:00' }],
    });
  });
});

describe('the assistant course (exact days a week, lesson count)', () => {
  const course = { perWeek: 2, lessonsTotal: 8, package: '8' as const, startsOn: '2026-10-03' };

  it('walks teacher → slot → review, and the slot step waits for exactly perWeek days', () => {
    expect(stepsOf(ready({ course }))).toEqual(['teacher', 'slot', 'review']);
    expect(stepsOf(ready())).toEqual(['students', 'teacher', 'package', 'slot', 'invoice', 'review']);
    expect(stepReady(ready({ course }), 'slot')).toBe(false);
    expect(stepReady(ready({ course, extra: [TUE_1930] }), 'slot')).toBe(true);
    expect(stepReady(ready({ course, startsAt: SAT_10, extra: [SUN_17, TUE_1930] }), 'slot')).toBe(false);
    expect(stepReady(ready({ extra: [TUE_1930] }), 'slot')).toBe(true);
  });

  it('ends on the date of the last of its lessons', () => {
    // Sun 4, Tue 6, … the 8th lesson is Tuesday 27 October.
    expect(courseEnd(ready({ course, extra: [TUE_1930] }))).toBe('2026-10-27');
    expect(courseEnd(ready({ extra: [TUE_1930] }))).toBeNull();
    expect(courseEnd(ready({ course, startsAt: null }))).toBeNull();
  });
});
