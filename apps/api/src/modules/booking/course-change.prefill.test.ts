import { changePicks, dayTimesKeeping, prefillDays, type BookedCourse, type CourseChangeRequest } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { errorCode } from '../scheduling/errors';
import { assertStart } from './course-change.plan';
import { bookedCourse, type CourseRuleRow } from './course-read';

// The change form's unchanged prefill (shared changePicks) against the server's no_change, with a
// pending change: the old rules hold the days before the latest set's startsOn (PR #117 review fix 1).

const TZ = 'Asia/Riyadh';
const SUB = '00000000-0000-4000-8000-000000000001';
const rule = (id: string, o: Pick<CourseRuleRow, 'byday' | 'starts_on' | 'ends_on'>): CourseRuleRow => ({
  id,
  subscription_id: SUB,
  teacher_id: '00000000-0000-4000-8000-000000000002',
  duration_min: 45,
  start_time_local: '17:00:00',
  tz: TZ,
  status: 'active',
  first_rule_id: null,
  sub: { package: null, lessons_total: 8 },
  teacher: { tz: TZ },
  ...o,
});

/** The body the form sends for `picks` (as web changeBody / mobile changeRequest build it). */
const bodyOf = (course: BookedCourse, from: string | null, now: Date): CourseChangeRequest => {
  const prefilled = from ? prefillDays({ days: course.days, from, tz: TZ, now: now.toISOString() }) : changePicks(course, now);
  const picked = dayTimesKeeping(prefilled.map((p) => p.at), TZ, prefilled);
  if (!picked) throw new Error('no picks');
  return { subscriptionId: SUB, ...picked, clientRequestId: '00000000-0000-4000-8000-000000000003' };
};

const refusal = (req: CourseChangeRequest, rows: CourseRuleRow[]): string | undefined => {
  try {
    assertStart(req, { subStartsOn: '2026-10-01', rules: rows });
    return undefined;
  } catch (e) {
    return errorCode(e);
  }
};

const cases = [
  {
    name: 'booked ahead from Sun 8 Nov on Sun+Tue, changed to Sun+Thu from Thu 12 Nov',
    now: new Date('2026-10-18T06:00:00Z'),
    rows: [rule('a', { byday: [0, 2], starts_on: '2026-11-08', ends_on: '2026-11-11' }), rule('b', { byday: [0, 4], starts_on: '2026-11-12', ends_on: '2026-12-10' })],
    opens: '2026-11-08',
    startsOn: '2026-11-12',
  },
  {
    name: 'running on Sun+Tue, changed to Sun+Thu from Thu 22 Oct',
    now: new Date('2026-10-18T06:00:00Z'),
    rows: [rule('a', { byday: [0, 2], starts_on: '2026-10-04', ends_on: '2026-10-21' }), rule('b', { byday: [0, 4], starts_on: '2026-10-22', ends_on: '2026-11-19' })],
    opens: '2026-10-18',
    startsOn: '2026-10-22',
  },
];

describe.each(cases)('the unchanged prefill with a pending change: $name', ({ now, rows, opens, startsOn }) => {
  const course = bookedCourse(rows, now);
  it('is refused with no_change (the prefill starts on the latest set’s startsOn)', () => {
    expect(course?.opensOn).toBe(opens);
    if (!course) throw new Error('no course');
    const req = bodyOf(course, null, now);
    expect(req.startsOn).toBe(startsOn);
    expect(refusal(req, rows)).toBe('no_change');
  });
  it('a prefill from opensOn / today would have moved an old lesson (not no_change)', () => {
    if (!course) throw new Error('no course');
    const req = bodyOf(course, opens, now);
    expect(req.startsOn < startsOn).toBe(true);
    expect(refusal(req, rows)).toBeUndefined();
  });
});
