import { rescheduleRequestSchema } from '@ab/shared';
import { jana, lesson, pending } from '@/today/fixtures';
import { familyTz, lessonDuration, repeatDays, rescheduleBody, seriesDays } from './reschedule-body';

// Saturday 3 Oct 2026, 17:00 in Riyadh.
const SAT_17 = '2026-10-03T14:00:00.000Z';

test('«الحلقة دي بس» moves this lesson to the picked slot, nothing else', () => {
  expect(rescheduleBody({ lesson: pending, scope: 'one', startsAt: SAT_17, byday: [2] })).toEqual({
    scope: 'one',
    startsAt: SAT_17,
  });
});

test('«الحلقة دي وكل اللي بعدها» starts a weekly rule at the slot, same teacher and length', () => {
  const body = rescheduleBody({ lesson: pending, scope: 'rule', startsAt: SAT_17, byday: [] });
  expect(body).toEqual({
    scope: 'rule',
    newRule: {
      teacherId: 't1',
      byday: [6],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: '2026-10-03',
    },
  });
});

test('both bodies pass the API’s own schema (real uuid teacher)', () => {
  const teacher = { id: '7f1d5f3e-4b8a-4c56-9a1e-0c8a3b2d4e5f', display_name_ar: 'أبرار', tz: 'Africa/Cairo' };
  const real = lesson({ id: 'u', teacher });
  for (const scope of ['one', 'rule'] as const) {
    const body = rescheduleBody({ lesson: real, scope, startsAt: SAT_17, byday: [2] });
    expect(rescheduleRequestSchema.safeParse(body).success).toBe(true);
  }
});

test('a series keeps the family’s wall clock: Muscat past midnight is the next day there', () => {
  const muscat = lesson({ id: 'm', students: [jana] });
  const late = '2026-10-03T20:30:00.000Z'; // Saturday 23:30 Riyadh = Sunday 00:30 Muscat
  expect(familyTz(muscat)).toBe('Asia/Muscat');
  const body = rescheduleBody({ lesson: muscat, scope: 'rule', startsAt: late, byday: [3] });
  expect(body?.scope === 'rule' ? body.newRule : null).toMatchObject({
    tz: 'Asia/Muscat',
    startsOn: '2026-10-04',
    startTimeLocal: '00:30',
    byday: [0, 3],
  });
});

test('the repeat days always hold the slot’s day, once, in order', () => {
  expect(repeatDays(SAT_17, 'Asia/Riyadh', [])).toEqual([6]);
  expect(repeatDays(SAT_17, 'Asia/Riyadh', [6, 2, 6])).toEqual([2, 6]);
});

test('a length outside 30/45/60/90 cannot become a rule (one lesson still moves)', () => {
  const odd = lesson({ id: 'o', starts_at: '2026-10-01T13:00:00.000Z', ends_at: '2026-10-01T13:50:00.000Z' });
  expect(lessonDuration(odd)).toBeNull();
  expect(lessonDuration(pending)).toBe(45);
  expect(rescheduleBody({ lesson: odd, scope: 'rule', startsAt: SAT_17, byday: [] })).toBeNull();
  expect(rescheduleBody({ lesson: odd, scope: 'one', startsAt: SAT_17, byday: [] })).not.toBeNull();
});

test('no students on the lesson: the family zone falls back to Riyadh', () => {
  expect(familyTz({ students: [] })).toBe('Asia/Riyadh');
});

describe('seriesDays: the moved series keeps how often it repeats', () => {
  const thu = lesson({ id: 'thu', starts_at: '2026-10-01T14:00:00.000Z', rule_byday: [0, 4] });
  it('Sun+Thu, Thu → Sat (2 days on) → Tue+Sat', () => {
    expect(seriesDays(thu, '2026-10-03T14:00:00.000Z', 'Asia/Riyadh')).toEqual([2, 6]);
  });
  it('unknown rule days (old cache) → the slot’s day only', () => {
    expect(seriesDays({ ...thu, rule_byday: undefined }, '2026-10-03T14:00:00.000Z', 'Asia/Riyadh')).toEqual([6]);
  });
});
