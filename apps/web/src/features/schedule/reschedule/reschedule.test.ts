import { rescheduleRequestSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson, SUHAILA } from '../lesson/lesson-fixture';
import { familyTz, rescheduleBody, seriesDays } from './reschedule';

const TEACHER_ID = '6f1c2a3e-1b2c-4d5e-8f90-123456789abc';
const L = lesson({ teacher: { id: TEACHER_ID, display_name_ar: 'أبرار', tz: 'Africa/Cairo' }, students: [{ ...SUHAILA, tz: 'Asia/Riyadh' }] });
const AT = '2026-10-05T15:00:00.000Z'; // Monday 18:00 Riyadh

describe('rescheduleBody (R-SCH-07)', () => {
  it('scope one moves just this occurrence', () => {
    const body = rescheduleBody({ lesson: L, scope: 'one', startsAt: AT, byday: [] });
    expect(body).toEqual({ scope: 'one', startsAt: AT });
    expect(rescheduleRequestSchema.safeParse(body).success).toBe(true);
  });

  it('carries the override reason', () => {
    expect(rescheduleBody({ lesson: L, scope: 'one', startsAt: AT, byday: [], override: 'ظرف' })).toEqual({
      scope: 'one',
      startsAt: AT,
      override: { reason: 'ظرف' },
    });
  });

  it('scope rule starts a new weekly rule at the picked local day and time', () => {
    const body = rescheduleBody({ lesson: L, scope: 'rule', startsAt: AT, byday: [3, 1] });
    expect(body).toEqual({
      scope: 'rule',
      newRule: {
        teacherId: TEACHER_ID,
        byday: [1, 3],
        startTimeLocal: '18:00',
        tz: 'Asia/Riyadh',
        durationMin: 45,
        startsOn: '2026-10-05',
      },
    });
    expect(rescheduleRequestSchema.safeParse(body).success).toBe(true);
  });

  it('a lesson of an odd length cannot become a rule', () => {
    expect(rescheduleBody({ lesson: lesson({ minutes: 50 }), scope: 'rule', startsAt: AT, byday: [] })).toBeNull();
  });

  it('familyTz is the first student zone, Riyadh without students', () => {
    expect(familyTz(L)).toBe('Asia/Riyadh');
    expect(familyTz(lesson({ students: [] }))).toBe('Asia/Riyadh');
    expect(familyTz(lesson())).toBe('Africa/Cairo');
  });
});

describe('seriesDays (R-SCH-07): a moved series keeps how often it repeats', () => {
  // L is Sun 4 Oct 17:00 Riyadh; AT is Mon 5 Oct.
  it('Sun+Wed moved from Sun to Mon → Mon+Thu', () => {
    expect(seriesDays({ ...L, rule_byday: [0, 3] }, AT)).toEqual([1, 4]);
  });
  it('rule days unknown (an old cache) → just the new slot’s day', () => {
    expect(seriesDays(L, AT)).toEqual([1]);
    expect(seriesDays({ ...L, rule_byday: null }, AT)).toEqual([1]);
  });
});
