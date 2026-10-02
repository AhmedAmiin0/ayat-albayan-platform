import { describe, expect, it } from 'vitest';
import {
  cancelRequestSchema,
  lessonStatusRequestSchema,
  rescheduleRequestSchema,
  ruleCancelRequestSchema,
  ruleExtendRequestSchema,
} from './scheduling.js';

const T = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const NEW_RULE = {
  teacherId: T,
  byday: [1, 3],
  startTimeLocal: '18:30',
  tz: 'Africa/Cairo',
  durationMin: 30,
  startsOn: '2026-10-11',
};

describe('RescheduleRequest (R-SCH-07)', () => {
  it('scope one takes an ISO instant with offset', () => {
    const r = rescheduleRequestSchema.parse({
      scope: 'one',
      startsAt: '2026-10-06T15:00:00+03:00',
    });
    expect(r).toEqual({ scope: 'one', startsAt: '2026-10-06T15:00:00+03:00' });
  });

  it('scope rule takes a whole new weekly rule', () => {
    const r = rescheduleRequestSchema.parse({ scope: 'rule', newRule: NEW_RULE });
    expect(r.scope === 'rule' && r.newRule.byday).toEqual([1, 3]);
  });

  it.each([
    ['one without startsAt', { scope: 'one' }],
    ['one with a local time instead of an instant', { scope: 'one', startsAt: '2026-10-06 15:00' }],
    ['rule without newRule', { scope: 'rule', startsAt: '2026-10-06T15:00:00Z' }],
    ['an unknown scope', { scope: 'all', startsAt: '2026-10-06T15:00:00Z' }],
  ])('rejects %s', (_name, body) => {
    expect(rescheduleRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe('CancelRequest (R-SCH-07)', () => {
  it.each(['teacher', 'admin', 'student'])('accepts by=%s', (by) => {
    expect(cancelRequestSchema.safeParse({ scope: 'one', by, reason: 'سفر' }).success).toBe(true);
  });

  it.each([
    ['no reason', { scope: 'one', by: 'admin' }],
    ['a blank reason', { scope: 'one', by: 'admin', reason: ' ' }],
    ['by guardian', { scope: 'rule', by: 'guardian', reason: 'سفر' }],
  ])('rejects %s', (_name, body) => {
    expect(cancelRequestSchema.safeParse(body).success).toBe(false);
  });

  it('rule cancel takes an optional local start date', () => {
    expect(
      ruleCancelRequestSchema.parse({ by: 'student', reason: 'وقف', from: '2026-11-01' }),
    ).toEqual({
      by: 'student',
      reason: 'وقف',
      from: '2026-11-01',
    });
    expect(
      ruleCancelRequestSchema.safeParse({ by: 'student', reason: 'وقف', from: '1/11' }).success,
    ).toBe(false);
  });
});

describe('status and extend commands (R-SCH-02, R-SCH-08)', () => {
  it.each(['complete', 'mark_late', 'mark_no_show', 'excuse'])('status accepts %s', (event) => {
    expect(lessonStatusRequestSchema.safeParse({ event }).success).toBe(true);
  });

  it.each(['confirm', 'cancel_by_admin', 'reschedule'])(
    'status rejects %s (own route)',
    (event) => {
      expect(lessonStatusRequestSchema.safeParse({ event }).success).toBe(false);
    },
  );

  it('extend weeks is optional and capped at 12', () => {
    expect(ruleExtendRequestSchema.parse({})).toEqual({});
    expect(ruleExtendRequestSchema.safeParse({ weeks: 13 }).success).toBe(false);
  });
});
