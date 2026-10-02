import { describe, expect, it } from 'vitest';
import { LESSON_STATUSES } from '../enums/index.js';
import { isChargeable } from './chargeable.js';

const START = new Date('2026-10-04T14:00:00Z');
const hoursBefore = (h: number) => new Date(START.getTime() - h * 3_600_000);
const base = { startsAt: START, at: hoursBefore(48), lateCancelHours: null };

describe('isChargeable by status (R-SCH-07)', () => {
  it.each([
    ['scheduled', true],
    ['confirmed', true],
    ['completed', true],
    ['late', true],
    ['no_show', true],
    ['cancelled_by_teacher', false],
    ['cancelled_by_admin', false],
    ['rescheduled', false],
    ['excused', false],
  ] as const)('%s → %s with the late-cancel policy off', (status, expected) => {
    expect(isChargeable({ ...base, status })).toBe(expected);
  });

  it('covers every lesson status', () => {
    for (const status of LESSON_STATUSES) {
      expect(typeof isChargeable({ ...base, status })).toBe('boolean');
    }
  });

  it('a teacher cancellation is never chargeable, even late with the policy on', () => {
    const late = { ...base, at: hoursBefore(1), lateCancelHours: 12 };
    expect(isChargeable({ ...late, status: 'cancelled_by_teacher' })).toBe(false);
    expect(isChargeable({ ...late, status: 'cancelled_by_admin' })).toBe(false);
  });
});

describe('student late cancellation (excused), R-SCH-07', () => {
  const excused = (at: Date, lateCancelHours: number | null) =>
    isChargeable({ status: 'excused', startsAt: START, at, lateCancelHours });

  it('policy off (null, the default): never chargeable, even after the start', () => {
    expect(excused(hoursBefore(1), null)).toBe(false);
    expect(excused(hoursBefore(-2), null)).toBe(false);
  });

  it('policy on: a cancel before the window is free', () => {
    expect(excused(hoursBefore(13), 12)).toBe(false);
  });

  it('policy on: a cancel inside the window is chargeable', () => {
    expect(excused(hoursBefore(11), 12)).toBe(true);
  });

  it('policy on: exactly N hours before the start counts as late', () => {
    expect(excused(hoursBefore(12), 12)).toBe(true);
    expect(excused(new Date(hoursBefore(12).getTime() - 1), 12)).toBe(false);
  });

  it('policy on: a cancel after the start is chargeable', () => {
    expect(excused(hoursBefore(-1), 12)).toBe(true);
  });

  it('policy set to 0 hours: only a cancel at or after the start is chargeable', () => {
    expect(excused(hoursBefore(0.5), 0)).toBe(false);
    expect(excused(START, 0)).toBe(true);
  });
});
