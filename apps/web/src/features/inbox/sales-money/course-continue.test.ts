import { courseOpensOn, prefillDays, type SalesCourseView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { adjustText, continuePlan, continueText } from './course-continue';
import { courseDraft } from './course-draft';
import { COURSE_SUB, COURSE_VIEW, NEXT_SUN, NEXT_WED, PREVIOUS, RENEWAL_VIEW } from './course-fixture';

const NOW = '2026-10-03T09:00:00.000Z';
/** The previous course's days as the choice names them: Sunday 17:00, Wednesday 19:30. */
const previousDays = [t.booking.dayAt, t.booking.dayAt]
  .map((s, i) => s.replace('{day}', t.enums.weekday[i === 0 ? 0 : 3]).replace('{time}', i === 0 ? '17:00' : '19:30'))
  .join(t.common.listSeparator);

describe('«تابِع بنفس الأيام»: a renewal’s plan (owner 2026-10-18)', () => {
  it('prefills the previous days from the day after the previous course, with its teacher', () => {
    const plan = continuePlan(RENEWAL_VIEW, NOW);
    const prefilled = prefillDays({ days: PREVIOUS.days, from: '2026-10-11', tz: 'Asia/Riyadh', now: NOW });
    expect(prefilled.map((p) => p.at)).toEqual([NEXT_SUN, NEXT_WED]);
    expect(plan?.hint).toEqual({ teacherId: PREVIOUS.teacherId, startsAt: null, picks: [NEXT_SUN, NEXT_WED] });
    // Each prefilled day keeps its own time for the body (dayTimesKeeping).
    expect(plan?.draft.course).toMatchObject({ startsOn: '2026-10-11', prefilled, perWeek: 2 });
    expect(prefilled[1]).toEqual({ at: NEXT_WED, weekday: 3, startTimeLocal: '19:30' });
    // The draft itself starts empty: the hinted teacher brings the picks (teacherPatch).
    expect(plan?.draft).toMatchObject({ teacher: null, startsAt: null, extra: [] });
  });

  it('a `from` weeks in the past opens today and rolls each day to its coming week', () => {
    const old: SalesCourseView = {
      ...RENEWAL_VIEW,
      subscription: { ...COURSE_SUB, starts_on: '2026-08-30' },
      previous: { ...PREVIOUS, endsOn: '2026-09-05' },
    };
    expect(courseOpensOn(old)).toBe('2026-09-06');
    const plan = continuePlan(old, NOW);
    expect(plan?.draft.course?.startsOn).toBe('2026-10-03');
    // Saturday 3 October, 12:00 Riyadh: Sunday 4 at 17:00 and Wednesday 7 at 19:30.
    expect(plan?.hint.picks).toEqual(['2026-10-04T14:00:00.000Z', '2026-10-07T16:30:00.000Z']);
    expect(continueText(old, NOW)).toContain(dateLabel('2026-10-03'));
  });

  it('the course draft opens on courseOpensOn, with or without a previous course', () => {
    expect(courseDraft(RENEWAL_VIEW)?.course?.startsOn).toBe(courseOpensOn(RENEWAL_VIEW));
    expect(courseDraft(COURSE_VIEW)?.course?.startsOn).toBe('2026-10-03');
    // A previous course that ended before the subscription starts: the subscription's day.
    const early = { ...RENEWAL_VIEW, previous: { ...PREVIOUS, endsOn: '2026-09-20' } };
    expect(courseDraft(early)?.course?.startsOn).toBe('2026-10-03');
  });

  it('with now, the course draft never opens before today in the family’s zone', () => {
    const past = { ...COURSE_VIEW, subscription: { ...COURSE_SUB, starts_on: '2026-09-01' } };
    expect(courseDraft(past)?.course?.startsOn).toBe('2026-09-01');
    expect(courseDraft(past, NOW)?.course?.startsOn).toBe('2026-10-03');
  });

  it('nothing to continue without a previous course, without its days, or while blocked', () => {
    expect(continuePlan(COURSE_VIEW, NOW)).toBeNull();
    expect(continuePlan({ ...RENEWAL_VIEW, previous: { ...PREVIOUS, days: [] } }, NOW)).toBeNull();
    expect(continuePlan({ ...RENEWAL_VIEW, blocked: 'course_exists' }, NOW)).toBeNull();
  });

  it('names the previous days and the new start', () => {
    expect(continueText(RENEWAL_VIEW)).toBe(
      t.booking.courseChange.continueHint.replace('{days}', previousDays).replace('{date}', dateLabel('2026-10-11')),
    );
  });

  it('another day count than before: the previous days and the new count, with Arabic number agreement', () => {
    const forms = t.booking.courseChange.continueAdjust;
    expect(adjustText({ ...RENEWAL_VIEW, perWeek: 3 })).toBe(forms.few.replaceAll('{n}', '3').replace('{days}', previousDays));
    expect(adjustText({ ...RENEWAL_VIEW, perWeek: 1 })).toBe(forms.one.replace('{days}', previousDays));
  });

  it('1 → 3 and 3 → 1 days a week: the target count, never «add or remove one day»', () => {
    const sunday = PREVIOUS.days.slice(0, 1);
    const three = [...PREVIOUS.days, { weekday: 5, startTimeLocal: '17:00' }];
    const up = adjustText({ ...RENEWAL_VIEW, previous: { ...PREVIOUS, days: sunday }, perWeek: 3 });
    const down = adjustText({ ...RENEWAL_VIEW, previous: { ...PREVIOUS, days: three }, perWeek: 1 });
    expect(up).toMatch(/الباقة الجديدة 3 أيام في الأسبوع، فعدّل الأيام السابقة لتصبح 3 أيام$/);
    expect(down).toMatch(/الباقة الجديدة يوم واحد في الأسبوع، فعدّل الأيام السابقة لتصبح يومًا واحدًا$/);
    for (const text of [up, down]) expect(text).not.toContain('أضف');
  });
});
