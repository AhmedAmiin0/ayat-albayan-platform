import { courseChangeSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { changeBody, currentPicks, picksReady } from './change-body';
import { COURSE, MON, NOW, SUN, WED } from './change-fixture';

const REQ = '11111111-2222-4333-8444-555555555555';

describe('«تغيير أيام الحلقات»: picks and body (owner 2026-10-18)', () => {
  it('prefills the current days in their first future week, in the course zone', () => {
    expect(currentPicks(COURSE, new Date(NOW))).toEqual([SUN, WED]);
    // Sunday 18:00 Riyadh: this Sunday's 17:00 has passed, so Sunday moves on a week.
    expect(currentPicks(COURSE, new Date('2026-10-04T15:00:00.000Z'))).toEqual([WED, '2026-10-11T14:00:00.000Z']);
  });

  it('needs exactly the plan’s days a week; a custom count at least one', () => {
    expect(picksReady(COURSE, [SUN])).toBe(false);
    expect(picksReady(COURSE, [SUN, WED])).toBe(true);
    expect(picksReady({ perWeek: null }, [SUN])).toBe(true);
    expect(picksReady({ perWeek: null }, [])).toBe(false);
  });

  it('builds a valid body: the earliest pick first, the other day’s own time, the request id', () => {
    const body = changeBody({ course: COURSE, picks: [WED, MON], requestId: REQ });
    expect(body).toEqual({
      subscriptionId: COURSE.subscriptionId,
      byday: [1, 3],
      startTimeLocal: '18:00',
      startsOn: '2026-10-05',
      startsAt: MON,
      dayTimes: [{ weekday: 3, startTimeLocal: '19:30' }],
      clientRequestId: REQ,
    });
    expect(courseChangeSchema.safeParse(body).success).toBe(true);
  });

  it('carries the admin’s override reason; nothing picked = no body', () => {
    expect(changeBody({ course: COURSE, picks: [SUN], requestId: REQ, override: 'طلب ولي الأمر' })?.override).toEqual({ reason: 'طلب ولي الأمر' });
    expect(changeBody({ course: COURSE, picks: [], requestId: REQ })).toBeNull();
  });
});
