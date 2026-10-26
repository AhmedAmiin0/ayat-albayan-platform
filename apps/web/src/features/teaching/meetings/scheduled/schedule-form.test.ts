import { describe, expect, it } from 'vitest';
import { fromOption, fromPhone } from '../invitees/invitee-list';
import { createBody, defaultSchedule, DURATION_OPTIONS, quarterTimes, scheduleIssue, scheduleOf, startsAtOf } from './schedule-form';

const NOW = new Date('2026-10-12T08:00:00.000Z');

describe('schedule-form', () => {
  it('offers 96 quarter-hour times, keeping an off-grid current one', () => {
    const all = quarterTimes();
    expect(all).toHaveLength(96);
    expect(all.slice(0, 3)).toEqual(['00:00', '00:15', '00:30']);
    expect(all.at(-1)).toBe('23:45');
    expect(quarterTimes('10:10')).toContain('10:10');
    expect(quarterTimes('10:15')).toHaveLength(96);
  });

  it('durations run 15..240 in 15-minute steps', () => {
    expect(DURATION_OPTIONS[0]).toBe(15);
    expect(DURATION_OPTIONS.at(-1)).toBe(240);
    expect(DURATION_OPTIONS).toHaveLength(16);
  });

  it('defaults to the next quarter hour at least 15 minutes ahead, on the viewer clock, 60 minutes', () => {
    expect(defaultSchedule(NOW, 'Asia/Riyadh')).toEqual({ date: '2026-10-12', time: '11:15', durationMin: 60 });
    expect(defaultSchedule(new Date('2026-10-12T21:52:00.000Z'), 'Asia/Riyadh')).toEqual({ date: '2026-10-13', time: '01:15', durationMin: 60 });
  });

  it('turns the wall clock in the viewer zone into a UTC ISO start', () => {
    expect(startsAtOf({ date: '2026-10-14', time: '18:00' }, 'Asia/Riyadh')).toBe('2026-10-14T15:00:00.000Z');
    expect(startsAtOf({ date: '2026-10-14', time: '18:00' }, 'UTC')).toBe('2026-10-14T18:00:00.000Z');
  });

  it('reads a stored meeting back on the viewer clock (duration clamped to 15..240)', () => {
    expect(scheduleOf({ starts_at: '2026-10-13T12:00:00.000Z', planned_end_at: '2026-10-13T13:30:00.000Z' }, 'Asia/Riyadh')).toEqual({
      date: '2026-10-13',
      time: '15:00',
      durationMin: 90,
    });
    expect(scheduleOf({ starts_at: '2026-10-13T12:00:00.000Z', planned_end_at: null }, 'UTC').durationMin).toBe(60);
    expect(scheduleOf({ starts_at: '2026-10-13T12:00:00.000Z', planned_end_at: '2026-10-14T12:00:00.000Z' }, 'UTC').durationMin).toBe(240);
  });

  it('refuses a past start and one more than 90 days ahead', () => {
    const ctx = { now: NOW, tz: 'Asia/Riyadh' };
    expect(scheduleIssue({ date: '2026-10-12', time: '10:45', durationMin: 60 }, ctx)).toBe('starts_in_past');
    expect(scheduleIssue({ date: '2026-10-12', time: '11:15', durationMin: 60 }, ctx)).toBeNull();
    expect(scheduleIssue({ date: '2027-02-01', time: '11:15', durationMin: 60 }, ctx)).toBe('too_far_ahead');
    expect(scheduleIssue({ date: '', time: '11:15', durationMin: 60 }, ctx)).toBe('starts_in_past');
  });

  it('builds the POST body with only what was given', () => {
    expect(createBody({ title: '  ', invitees: [], clientRequestId: 'r-1' })).toEqual({ clientRequestId: 'r-1' });
    const phone = fromPhone('+201000000101');
    const staff = fromOption({ kind: 'staff', id: 's-1', name: 'سارة', role: 'teacher' });
    expect(
      createBody({
        title: ' لقاء ',
        invitees: [staff, ...(phone ? [phone] : [])],
        clientRequestId: 'r-2',
        schedule: { value: { date: '2026-10-14', time: '18:00', durationMin: 45 }, tz: 'Asia/Riyadh' },
      }),
    ).toEqual({
      title: 'لقاء',
      startsAt: '2026-10-14T15:00:00.000Z',
      durationMin: 45,
      invitees: [{ kind: 'staff', profileId: 's-1' }, { kind: 'phone', phone: '+201000000101' }],
      clientRequestId: 'r-2',
    });
  });
});
