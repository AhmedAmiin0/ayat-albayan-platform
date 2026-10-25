import { bookingRequestSchema, counted, courseBodyPackage } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { ABRAR } from '@/features/booking/wizard-fixture';
import { stepReady, toBookingRequest, withPicks } from '@/features/booking/draft/draft';
import { dateLabel } from '@/features/schedule/tz';
import { studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { COURSE_SUB, COURSE_VIEW } from './course-fixture';
import { courseDraft, courseFixedText, courseHint, courseTitle, subscriptionStartsText } from './course-draft';

// Saturday 3 … Thursday 8 October 2026, 17:00 Riyadh: six weekdays.
const SIX_DAYS = [3, 4, 5, 6, 7, 8].map((d) => `2026-10-0${d}T14:00:00.000Z`);
const custom = (lessons_total: number) => ({ ...COURSE_VIEW, subscription: { ...COURSE_SUB, package: null, lessons_total } });

describe('the course wizard’s draft from GET /sales/booking/course (owner 2026-10-18)', () => {
  it('fixes the student, zone, program, preference, package, length and the counts from the view', () => {
    expect(courseDraft(COURSE_VIEW)).toMatchObject({
      kind: 'package',
      students: [{ id: COURSE_VIEW.student.id, name: 'سهيلة', code: 'AB-0183' }],
      tz: 'Asia/Riyadh',
      program: 'quran',
      genderPref: 'female',
      durationMin: 45,
      pkg: '8',
      startsAt: null,
      extra: [],
      invoice: null,
      course: { perWeek: 2, lessonsTotal: 8, package: '8', startsOn: '2026-10-03' },
    });
  });

  it('a custom 24-lesson count (perWeek 6) books with 6 days; the body’s package is courseBodyPackage, never a label', () => {
    const draft = courseDraft({ ...custom(24), perWeek: 6 });
    expect(draft?.course).toEqual({ perWeek: 6, lessonsTotal: 24, package: null, startsOn: '2026-10-03' });
    if (!draft) throw new Error('no draft');
    const five = { ...draft, teacher: ABRAR, ...withPicks(SIX_DAYS.slice(0, 5)) };
    const six = { ...draft, teacher: ABRAR, ...withPicks(SIX_DAYS) };
    expect(stepReady(five, 'slot')).toBe(false);
    expect(stepReady(six, 'slot')).toBe(true);
    const body = toBookingRequest(six);
    expect(body).toMatchObject({ kind: 'package', byday: [0, 1, 2, 3, 4, 6], package: courseBodyPackage({ package: null }) });
    expect(bookingRequestSchema.safeParse(body).success).toBe(true);
    // The wizard names the lesson count, never the body's package.
    expect(courseFixedText({ ...COURSE_SUB, package: null, lessons_total: 24 })).not.toContain(t.enums.packageSize['8']);
  });

  it('a plan package goes on the request; the day count is the view’s perWeek only', () => {
    const draft = courseDraft(COURSE_VIEW);
    if (!draft) throw new Error('no draft');
    expect(toBookingRequest({ ...draft, teacher: ABRAR, ...withPicks(SIX_DAYS.slice(0, 2)) })).toMatchObject({ package: '8' });
    expect(courseDraft({ ...custom(12), perWeek: 5 })?.course?.perWeek).toBe(5);
  });

  it('nothing to book while blocked, without a subscription or without a day count', () => {
    expect(courseDraft({ ...COURSE_VIEW, blocked: 'course_exists' })).toBeNull();
    expect(courseDraft({ ...COURSE_VIEW, subscription: null })).toBeNull();
    expect(courseDraft({ ...COURSE_VIEW, perWeek: null })).toBeNull();
  });

  it('preselects the student’s teacher; the fixed line names the package and minutes', () => {
    expect(courseHint(COURSE_VIEW)).toEqual({ teacherId: COURSE_VIEW.student.teacher_id, startsAt: null });
    expect(courseHint({ ...COURSE_VIEW, student: { ...COURSE_VIEW.student, teacher_id: null } })).toBeNull();
    const sub = { id: 's', package: null, duration: 30, lessons_total: 12, starts_on: '2026-10-03' } as const;
    expect(courseFixedText(sub)).toBe(t.booking.courseFixed.replace('{package}', counted(t.schedule.lessonCount, 12)).replace('{minutes}', '30'));
  });

  it('the title names the child with the code; the start line its date', () => {
    expect(courseTitle(undefined)).toBe(t.booking.courseDays);
    expect(courseTitle(COURSE_VIEW)).toBe(`${t.booking.courseDays} — ${studentLabel({ name: 'سهيلة', code: 'AB-0183' })}`);
    expect(subscriptionStartsText(COURSE_SUB)).toBe(t.booking.subscriptionStarts.replace('{date}', dateLabel('2026-10-03')));
  });
});
