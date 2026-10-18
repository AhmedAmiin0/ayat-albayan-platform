import { courseOpensOn, prefillPicks } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { continuePlan, continueText } from './course-continue';
import { courseDraft } from './course-draft';
import { COURSE_VIEW, NEXT_SUN, NEXT_WED, PREVIOUS, RENEWAL_VIEW } from './course-fixture';

const NOW = '2026-10-03T09:00:00.000Z';

describe('«تابِع بنفس الأيام»: a renewal’s plan (owner 2026-10-18)', () => {
  it('prefills the previous days from the day after the previous course, with its teacher', () => {
    const plan = continuePlan(RENEWAL_VIEW, NOW);
    const picks = prefillPicks({ days: PREVIOUS.days, from: '2026-10-11', tz: 'Asia/Riyadh', now: NOW });
    expect(picks).toEqual([NEXT_SUN, NEXT_WED]);
    expect(plan?.hint).toEqual({ teacherId: PREVIOUS.teacherId, startsAt: null, picks });
    expect(plan?.draft.course).toMatchObject({ startsOn: '2026-10-11', prefilled: picks, perWeek: 2 });
    // The draft itself starts empty: the hinted teacher brings the picks (teacherPatch).
    expect(plan?.draft).toMatchObject({ teacher: null, startsAt: null, extra: [] });
  });

  it('the course draft opens on courseOpensOn, with or without a previous course', () => {
    expect(courseDraft(RENEWAL_VIEW)?.course?.startsOn).toBe(courseOpensOn(RENEWAL_VIEW));
    expect(courseDraft(COURSE_VIEW)?.course?.startsOn).toBe('2026-10-03');
    // A previous course that ended before the subscription starts: the subscription's day.
    const early = { ...RENEWAL_VIEW, previous: { ...PREVIOUS, endsOn: '2026-09-20' } };
    expect(courseDraft(early)?.course?.startsOn).toBe('2026-10-03');
  });

  it('nothing to continue without a previous course, without its days, or while blocked', () => {
    expect(continuePlan(COURSE_VIEW, NOW)).toBeNull();
    expect(continuePlan({ ...RENEWAL_VIEW, previous: { ...PREVIOUS, days: [] } }, NOW)).toBeNull();
    expect(continuePlan({ ...RENEWAL_VIEW, blocked: 'course_exists' }, NOW)).toBeNull();
  });

  it('names the previous days and the new start', () => {
    const days = [t.booking.dayAt, t.booking.dayAt]
      .map((s, i) => s.replace('{day}', t.enums.weekday[i === 0 ? 0 : 3]).replace('{time}', i === 0 ? '17:00' : '19:30'))
      .join(t.common.listSeparator);
    expect(continueText(RENEWAL_VIEW)).toBe(
      t.booking.courseChange.continueHint.replace('{days}', days).replace('{date}', dateLabel('2026-10-11')),
    );
  });
});
