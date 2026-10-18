import { bookingRequestSchema } from '@ab/shared';
import { maryam, SUN_17, THU_18, TUE_17 } from '@/booking/fixtures';
import { t } from '@/lib/i18n';
import { courseBlock, courseEnd, coursePackage, courseRequest } from './course-body';
import { courseFixedText, courseRows } from './course-summary';
import { courseView, STUDENT_ID } from './fixtures';

const REQ = '99999999-9999-4999-8999-999999999999';
const custom = (lessons_total: number, perWeek: number | null) =>
  courseView({
    subscription: { id: 's', package: null, duration: 60, lessons_total, starts_on: '2026-10-04' },
    perWeek,
  });

test('the package: the subscription’s, or a custom count’s weekly size when it is one', () => {
  expect(coursePackage(courseView())).toBe('8');
  expect(coursePackage(custom(12, 3))).toBe('12');
  expect(coursePackage(custom(28, 7))).toBe('28');
  expect(coursePackage(custom(24, 6))).toBeNull(); // 24 is no package size
  expect(coursePackage(courseView({ subscription: null, perWeek: null }))).toBeNull();
});

test('blocked: the API’s reason first, no subscription, or a count no booking can name', () => {
  expect(courseBlock(courseView())).toBeNull();
  expect(courseBlock(courseView({ blocked: 'course_exists' }))).toBe('course_exists');
  expect(courseBlock(courseView({ subscription: null, perWeek: null }))).toBe('subscription_required');
  expect(courseBlock(custom(24, 6))).toBe('custom_count_admin');
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
  expect(courseRequest({ view: custom(24, 6), teacherId: maryam.id, picks: [SUN_17], requestId: REQ })).toBeNull();
});

test('the course ends on its lessons_total-th lesson over every day', () => {
  const body = courseRequest({ view: courseView(), teacherId: maryam.id, picks: [SUN_17, THU_18], requestId: REQ });
  if (!body) throw new Error('no body');
  // Sun 4, Thu 8, Sun 11, Thu 15, Sun 18, Thu 22, Sun 25, Thu 29 Oct.
  expect(courseEnd(body, 8)).toBe('2026-10-29');
});

test('the review: the plan from the subscription, the first lesson when picked', () => {
  expect(courseFixedText(courseView(), '8')).toBe(
    t.booking.courseFixed.replace('{package}', t.enums.packageSize['8']).replace('{minutes}', '45'),
  );
  const rows = courseRows({ view: courseView(), teacherName: 'مريم', body: null });
  expect(rows.map(([label]) => label)).toEqual([t.booking.studentSection, t.booking.steps.teacher, t.booking.steps.package]);
});
