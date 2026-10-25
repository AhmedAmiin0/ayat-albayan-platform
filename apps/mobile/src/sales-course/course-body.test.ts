import { bookingRequestSchema, counted } from '@ab/shared';
import { maryam, SUN_17, THU_18, TUE_17 } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { courseBlock, courseEnd, courseRequest } from './course-body';
import { courseFixedText, courseRows } from './course-summary';
import { courseView, STUDENT_ID } from './fixtures';

const REQ = '99999999-9999-4999-8999-999999999999';
const custom = (lessons_total: number, perWeek: number | null) =>
  courseView({
    subscription: { id: 's', package: null, duration: 60, lessons_total, starts_on: '2026-10-04' },
    perWeek,
  });

test('blocked: the API’s reason first, no subscription, or no days a week to pick', () => {
  expect(courseBlock(courseView())).toBeNull();
  expect(courseBlock(courseView({ blocked: 'course_exists' }))).toBe('course_exists');
  expect(courseBlock(courseView({ subscription: null, perWeek: null }))).toBe('subscription_required');
  expect(courseBlock(custom(24, 6))).toBeNull(); // 24 lessons → 6 days a week, hers to book
  expect(courseBlock(custom(10, null))).toBe('custom_count_admin');
});

test('the request: a package for the one student, the plan’s size and length, a time per day', () => {
  const body = courseRequest({ view: courseView(), teacherId: maryam.id, picks: [THU_18, SUN_17], requestId: REQ });
  expect(body).toEqual({
    kind: 'package',
    studentIds: [STUDENT_ID],
    teacherId: maryam.id,
    byday: [0, 4],
    startTimeLocal: '17:00',
    startsOn: '2026-10-04',
    startsAt: SUN_17,
    dayTimes: [{ weekday: 4, startTimeLocal: '18:00' }],
    tz: 'Asia/Riyadh',
    durationMin: 45,
    package: '8',
    clientRequestId: REQ,
  });
  expect(bookingRequestSchema.safeParse(body).success).toBe(true);
  const same = courseRequest({ view: courseView(), teacherId: maryam.id, picks: [SUN_17, TUE_17], requestId: REQ });
  expect(same).not.toHaveProperty('dayTimes');
  expect(courseRequest({ view: courseView(), teacherId: maryam.id, picks: [], requestId: REQ })).toBeNull();
});

test('a custom count (24 lessons, 6 days) books its days; the body’s package only fills the schema', () => {
  const body = courseRequest({ view: custom(24, 6), teacherId: maryam.id, picks: [SUN_17, TUE_17], requestId: REQ });
  expect(body).toMatchObject({ kind: 'package', byday: [0, 2], durationMin: 60, package: '8', clientRequestId: REQ });
  expect(bookingRequestSchema.safeParse(body).success).toBe(true);
  // The label comes from the subscription (24 lessons), never from that body value.
  expect(courseRows({ view: custom(24, 6), teacherName: 'مريم', body })[2]?.[1]).toContain(counted(t.schedule.lessonCount, 24));
});

test('the course ends on its lessons_total-th lesson over every day', () => {
  const body = courseRequest({ view: courseView(), teacherId: maryam.id, picks: [SUN_17, THU_18], requestId: REQ });
  if (!body) throw new Error('no body');
  // Sun 4, Thu 8, Sun 11, Thu 15, Sun 18, Thu 22, Sun 25, Thu 29 Oct.
  expect(courseEnd(body, 8)).toBe('2026-10-29');
});

test('the review: the «الباقة» row holds the plan itself, no prefix', () => {
  const minutes = (n: '45' | '60') => t.enums.duration[n];
  expect(courseFixedText(courseView().subscription)).toBe(`${t.enums.packageSize['8']} · ${minutes('45')}`);
  expect(courseFixedText(custom(24, 6).subscription)).toBe(`${counted(t.schedule.lessonCount, 24)} · ${minutes('60')}`);
  const rows = courseRows({ view: courseView(), teacherName: 'مريم', body: null });
  expect(rows.map(([label]) => label)).toEqual([t.booking.studentSection, t.booking.steps.teacher, t.booking.steps.package]);
  expect(rows[2]?.[1]).not.toContain(t.booking.steps.package);
});

test('the review never shows an empty teacher row (her name not known)', () => {
  const rows = courseRows({ view: courseView(), teacherName: '', body: null });
  expect(rows.map(([label]) => label)).toEqual([t.booking.studentSection, t.booking.steps.package]);
});

test('a prefilled day keeps its explicit time in the body (DST-safe)', () => {
  const prefilled = [{ at: THU_18, weekday: 4, startTimeLocal: '17:59' }];
  const input = { view: courseView(), teacherId: maryam.id, requestId: REQ, prefilled };
  expect(courseRequest({ ...input, picks: [SUN_17, THU_18] })?.dayTimes).toEqual([{ weekday: 4, startTimeLocal: '17:59' }]);
  expect(courseRequest({ ...input, picks: [SUN_17, TUE_17] })).not.toHaveProperty('dayTimes');
});
