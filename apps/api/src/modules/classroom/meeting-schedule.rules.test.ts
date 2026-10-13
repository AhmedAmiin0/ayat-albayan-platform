import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { rescheduleTimes, scheduleTimes } from './meeting-schedule.rules';

const NOW = new Date('2026-10-12T10:00:00Z');
const code = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as HttpException).getResponse();
  }
};

describe('scheduleTimes / rescheduleTimes (R-MEET-01)', () => {
  it('instant without a start; 60 minutes by default; the duration when sent', () => {
    expect(scheduleTimes({ durationMin: 30 }, NOW)).toEqual({ startsAt: null, plannedEndAt: null });
    expect(scheduleTimes({ startsAt: '2026-10-12T14:00:00+03:00' }, NOW)).toEqual({ startsAt: '2026-10-12T11:00:00.000Z', plannedEndAt: '2026-10-12T12:00:00.000Z' });
    expect(scheduleTimes({ startsAt: '2026-10-13T08:00:00Z', durationMin: 15 }, NOW).plannedEndAt).toBe('2026-10-13T08:15:00.000Z');
  });

  it('400 starts_in_past and too_far_ahead', () => {
    expect(code(() => scheduleTimes({ startsAt: '2026-10-12T09:00:00Z' }, NOW))).toMatchObject({ code: 'starts_in_past' });
    expect(code(() => scheduleTimes({ startsAt: '2027-03-01T09:00:00Z' }, NOW))).toMatchObject({ code: 'too_far_ahead' });
  });

  it('reschedule keeps the length, takes a new duration, refuses a duration on an instant meeting', () => {
    const current = { starts_at: '2026-10-13T08:00:00.000Z', planned_end_at: '2026-10-13T08:45:00.000Z' };
    expect(rescheduleTimes(current, {}, NOW)).toBeNull();
    expect(rescheduleTimes(current, { startsAt: '2026-10-14T08:00:00Z' }, NOW)?.plannedEndAt).toBe('2026-10-14T08:45:00.000Z');
    expect(rescheduleTimes(current, { durationMin: 90 }, NOW)?.plannedEndAt).toBe('2026-10-13T09:30:00.000Z');
    expect(code(() => rescheduleTimes({ starts_at: null, planned_end_at: null }, { durationMin: 30 }, NOW))).toMatchObject({ code: 'not_scheduled' });
    expect(rescheduleTimes({ starts_at: null, planned_end_at: null }, { startsAt: '2026-10-13T08:00:00Z' }, NOW)?.plannedEndAt).toBe('2026-10-13T09:00:00.000Z');
  });
});
