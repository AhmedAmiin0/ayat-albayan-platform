import { describe, expect, it } from 'vitest';
import {
  changeEffectiveFrom,
  courseStopBlock,
  courseStopSchema,
  stopEndsOn,
  stoppedLessons,
  studentAfterStop,
} from './course-stop.js';

const SUB = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const REQ = '7a1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e12';
// 2026-10-30 21:30 UTC: already the 31st in Riyadh (+3), still the 30th in Cairo (+2) at 23:30.
const NOW = new Date('2026-10-30T21:30:00Z');

describe('«إلغاء الاشتراك» request (owner 2026-10-30)', () => {
  it('needs a short reason and the idempotency key', () => {
    expect(
      courseStopSchema.parse({ subscriptionId: SUB, reason: '  سفر  ', clientRequestId: REQ })
        .reason,
    ).toBe('سفر');
    expect(courseStopSchema.safeParse({ subscriptionId: SUB, clientRequestId: REQ }).success).toBe(
      false,
    );
    expect(
      courseStopSchema.safeParse({ subscriptionId: SUB, reason: ' ', clientRequestId: REQ })
        .success,
    ).toBe(false);
    expect(
      courseStopSchema.safeParse({
        subscriptionId: SUB,
        reason: 'x'.repeat(301),
        clientRequestId: REQ,
      }).success,
    ).toBe(false);
    expect(courseStopSchema.safeParse({ subscriptionId: SUB, reason: 'سفر' }).success).toBe(false);
  });

  it('is strict: a refund flag is refused', () => {
    expect(
      courseStopSchema.safeParse({
        subscriptionId: SUB,
        reason: 'سفر',
        clientRequestId: REQ,
        refund: true,
      }).success,
    ).toBe(false);
  });
});

describe('courseStopBlock', () => {
  it('refuses a cancelled package (either kind), allows every other status', () => {
    expect(courseStopBlock({ status: 'cancelled' })).toBe('already_cancelled');
    for (const status of ['trial', 'active', 'paused', 'expired', 'unpaid'] as const)
      expect(courseStopBlock({ status })).toBeNull();
  });
});

describe('stoppedLessons: which lessons a stop cancels', () => {
  const lessons = [
    { id: 'held', status: 'completed' as const, starts_at: '2026-10-29T15:00:00Z' },
    { id: 'unmarked-past', status: 'scheduled' as const, starts_at: '2026-10-30T15:00:00Z' },
    { id: 'now', status: 'confirmed' as const, starts_at: NOW.toISOString() },
    { id: 'next', status: 'scheduled' as const, starts_at: '2026-11-01T15:00:00Z' },
    { id: 'cancelled', status: 'cancelled_by_admin' as const, starts_at: '2026-11-02T15:00:00Z' },
    { id: 'moved', status: 'rescheduled' as const, starts_at: '2026-11-03T15:00:00Z' },
  ];

  it('only open lessons from now on; held, past unmarked, cancelled and moved ones stay', () => {
    expect(stoppedLessons(lessons, NOW).map((l) => l.id)).toEqual(['now', 'next']);
  });

  it('nothing to cancel is an empty list', () => {
    expect(stoppedLessons([], NOW)).toEqual([]);
  });
});

describe('studentAfterStop: the status transition', () => {
  it('every status becomes «توقف» (churned)', () => {
    for (const s of [
      'new',
      'trial',
      'pending_subscription',
      'active',
      'pending_renewal',
      'expired',
      'paused',
    ] as const)
      expect(studentAfterStop(s)).toBe('churned');
  });

  it('already churned: no move', () => {
    expect(studentAfterStop('churned')).toBeNull();
  });
});

describe('stopEndsOn: the rule ends on the cancel date in its zone', () => {
  it('today in the rule zone', () => {
    expect(stopEndsOn({ tz: 'Asia/Riyadh', ends_on: null }, NOW)).toBe('2026-10-31');
    expect(stopEndsOn({ tz: 'Africa/Cairo', ends_on: '2026-12-31' }, NOW)).toBe('2026-10-30');
  });

  it('never lengthens a rule ending earlier', () => {
    expect(stopEndsOn({ tz: 'Asia/Riyadh', ends_on: '2026-10-20' }, NOW)).toBe('2026-10-20');
  });
});

describe('changeEffectiveFrom: «من تاريخ» defaults to the next lesson', () => {
  const lessons = [
    { status: 'scheduled' as const, starts_at: '2026-11-04T16:00:00Z' },
    { status: 'cancelled_by_teacher' as const, starts_at: '2026-11-01T16:00:00Z' },
    { status: 'confirmed' as const, starts_at: '2026-11-02T22:30:00Z' },
    { status: 'scheduled' as const, starts_at: '2026-10-30T16:00:00Z' },
  ];

  it('the earliest open lesson still to come, its local date in the course zone', () => {
    expect(changeEffectiveFrom(lessons, { tz: 'Asia/Riyadh', now: NOW })).toEqual({
      startsOn: '2026-11-03',
      startsAt: '2026-11-02T22:30:00Z',
    });
    expect(changeEffectiveFrom(lessons, { tz: 'Africa/Cairo', now: NOW })?.startsOn).toBe(
      '2026-11-03',
    );
    expect(changeEffectiveFrom(lessons, { tz: 'America/New_York', now: NOW })?.startsOn).toBe(
      '2026-11-02',
    );
  });

  it('a lesson starting right now is not «upcoming»; none booked → null', () => {
    expect(
      changeEffectiveFrom([{ status: 'scheduled', starts_at: NOW.toISOString() }], {
        tz: 'Asia/Riyadh',
        now: NOW,
      }),
    ).toBeNull();
    expect(changeEffectiveFrom([], { tz: 'Asia/Riyadh', now: NOW })).toBeNull();
  });
});
