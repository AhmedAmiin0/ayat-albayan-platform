import { describe, expect, it } from 'vitest';
import { isPayoutLocked, isSameTime, payoutScope, planTimeEdit, type TimeEditInput } from './time-edit.plan';

// Sun 2026-10-04 14:00–14:45Z = 17:00 in Riyadh and Cairo (both UTC+3 that day: no DST in play).
const NOW = new Date('2026-10-02T10:00:00Z');
const current = { startsAt: new Date('2026-10-04T14:00:00Z'), endsAt: new Date('2026-10-04T14:45:00Z') };
const ZONES = ['Africa/Cairo', 'Asia/Riyadh'];

const move = (request: Partial<TimeEditInput['request']> = {}): TimeEditInput => ({
  mode: 'move',
  now: NOW,
  current,
  zones: ZONES,
  request: { startsAt: new Date('2026-10-05T14:00:00Z'), durationMin: 45, ...request },
});

describe('planTimeEdit — move (a scheduled / confirmed lesson)', () => {
  it('a new day: start and end follow the duration, the open-lesson side effects are on', () => {
    expect(planTimeEdit(move())).toEqual({
      mode: 'move',
      start: new Date('2026-10-05T14:00:00Z'),
      end: new Date('2026-10-05T14:45:00Z'),
      startChanged: true,
      durationChanged: false,
      reason: null,
      retimeOpen: true,
      refreshPdf: false,
      notify: true,
      ignoredConflicts: [],
    });
  });

  it('resizing in place: 45 → 60 with the same start changes no messages and no keys', () => {
    const plan = planTimeEdit(move({ startsAt: current.startsAt, durationMin: 60 }));
    expect(plan.end).toEqual(new Date('2026-10-04T15:00:00Z'));
    expect(plan).toMatchObject({ startChanged: false, durationChanged: true, retimeOpen: false, notify: false });
  });

  it('a move to the past (or to right now) is 400 date_in_past', () => {
    for (const startsAt of ['2026-10-02T09:59:00Z', '2026-10-02T10:00:00Z']) {
      expect(() => planTimeEdit(move({ startsAt: new Date(startsAt) }))).toThrow(
        expect.objectContaining({ status: 400, response: { code: 'date_in_past', message: 'date_in_past' } }),
      );
    }
  });

  it('notify: false suppresses the guardian notice; the reason is trimmed and optional', () => {
    expect(planTimeEdit(move({ notify: false })).notify).toBe(false);
    expect(planTimeEdit(move({ reason: '  طلب ولي الأمر ' })).reason).toBe('طلب ولي الأمر');
    expect(planTimeEdit(move({ reason: '   ' })).reason).toBeNull();
  });

  it('a move never ignores a conflict kind: the weekly grid and time-off still apply', () => {
    expect(planTimeEdit(move()).ignoredConflicts).toEqual([]);
  });
});

describe('isSameTime — replay detection', () => {
  it('same start and same length only', () => {
    const request = { startsAt: current.startsAt, durationMin: 45 };
    expect(isSameTime(current, request)).toBe(true);
    expect(isSameTime(current, { ...request, durationMin: 60 })).toBe(false);
    expect(isSameTime(current, { ...request, startsAt: new Date('2026-10-04T14:15:00Z') })).toBe(false);
  });
});

describe('payoutScope / isPayoutLocked', () => {
  const paid = ['completed'] as const;
  const plan = (over: Partial<ReturnType<typeof planTimeEdit>> = {}) => ({ ...planTimeEdit(move()), ...over });

  it('a move checks the NEW month in the teacher tz (a lesson on 1 Nov 00:30 Cairo is November)', () => {
    const start = new Date('2026-10-31T22:30:00Z'); // Cairo: 2026-11-01 00:30 (UTC+2: Egypt DST ended on the 29th)
    const scope = payoutScope({ plan: plan({ start }), status: 'scheduled', teacherTz: 'Africa/Cairo', paidStatuses: paid });
    expect(scope).toEqual({ month: '2026-11' });
  });

  it('a correction only touches payout when the length of a paid-status lesson changed', () => {
    const base = { ...plan(), mode: 'correct' as const, start: new Date('2026-10-01T14:00:00Z') };
    const args = { teacherTz: 'Africa/Cairo', paidStatuses: paid };
    expect(payoutScope({ ...args, plan: { ...base, durationChanged: true }, status: 'completed' })).toEqual({ month: '2026-10' });
    expect(payoutScope({ ...args, plan: { ...base, durationChanged: false }, status: 'completed' })).toBeNull();
    expect(payoutScope({ ...args, plan: { ...base, durationChanged: true }, status: 'late' })).toBeNull();
    expect(payoutScope({ ...args, paidStatuses: ['completed', 'late'], plan: { ...base, durationChanged: true }, status: 'late' })).toEqual({
      month: '2026-10',
    });
  });

  it('approved and paid are locked; a draft or no row is not', () => {
    expect([null, 'draft', 'approved', 'paid'].map((s) => isPayoutLocked(s as never))).toEqual([false, false, true, true]);
  });
});
