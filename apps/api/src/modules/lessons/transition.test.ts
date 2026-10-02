import { describe, expect, it } from 'vitest';
import { cancelChange, CANCEL_EVENT, invalidTransition } from './transition';

const LESSON = { id: 'l1', status: 'confirmed' as const, starts_at: '2026-10-04T14:00:00Z' };
const ctx = (over: Partial<Parameters<typeof cancelChange>[1]> = {}) => ({
  by: 'admin' as const,
  reason: 'سفر',
  now: new Date('2026-10-04T10:00:00Z'), // 4 h before the start
  lateCancelHours: null,
  ...over,
});

describe('cancelChange — chargeable on cancel (R-SCH-07)', () => {
  it('teacher and admin cancellations never consume the package', () => {
    expect(cancelChange(LESSON, ctx({ by: 'teacher', lateCancelHours: 24 }))).toEqual({
      id: 'l1',
      from_status: 'confirmed',
      to_status: 'cancelled_by_teacher',
      cancel_reason: 'سفر',
      chargeable: false,
    });
    expect(cancelChange(LESSON, ctx({ by: 'admin', lateCancelHours: 24 })).chargeable).toBe(false);
  });

  it("a student's cancellation is an excuse, free while the late-cancel setting is OFF (default)", () => {
    expect(cancelChange(LESSON, ctx({ by: 'student' }))).toMatchObject({
      to_status: 'excused',
      attendance: 'excused',
      chargeable: false,
    });
  });

  it('with late_cancel_hours set: within the window consumes, earlier does not', () => {
    expect(cancelChange(LESSON, ctx({ by: 'student', lateCancelHours: 6 })).chargeable).toBe(true);
    expect(cancelChange(LESSON, ctx({ by: 'student', lateCancelHours: 3 })).chargeable).toBe(false);
  });
});

describe('CANCEL_EVENT / invalidTransition', () => {
  it('maps who cancelled to the state-machine event', () => {
    expect(CANCEL_EVENT).toEqual({ teacher: 'cancel_by_teacher', admin: 'cancel_by_admin', student: 'excuse' });
  });

  it('409 body carries code, message, from and event', () => {
    expect(invalidTransition('completed', 'confirm').getResponse()).toEqual({
      code: 'invalid_transition',
      message: 'invalid_transition',
      from: 'completed',
      event: 'confirm',
    });
  });
});
