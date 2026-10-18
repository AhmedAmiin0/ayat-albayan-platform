import { counted } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { COURSE_SUB, COURSE_VIEW } from './course-fixture';
import { courseDraft, courseFixedText, courseHint } from './course-draft';

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
      course: { perWeek: 2, lessonsTotal: 8 },
    });
  });

  it('a custom count books under the package of its size, else 8 (the API accepts any)', () => {
    const custom = (lessons_total: number) => ({ ...COURSE_VIEW, subscription: { ...COURSE_SUB, package: null, lessons_total } });
    expect(courseDraft(custom(12))?.pkg).toBe('12');
    expect(courseDraft({ ...custom(24), perWeek: 6 })?.pkg).toBe('8');
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
});
