import { describe, expect, it } from 'vitest';
import { approveBlock, linesOf, monthWindow, planPayout, type PayoutLesson, type PlanInput } from './payouts.plan';

let seq = 0;
const lesson = (minutes: number, amount: number | null, status: PayoutLesson['status'] = 'completed'): PayoutLesson => ({
  id: `l${(seq += 1)}`,
  minutes,
  amount,
  status,
});
const teacher = { id: 't1', tz: 'Africa/Cairo' };
const base = (patch: Partial<PlanInput> = {}): PlanInput => ({
  teacher,
  lessons: [],
  existing: undefined,
  statuses: ['completed'],
  ...patch,
});

describe('monthWindow (a lesson month is its local date in the teacher tz)', () => {
  it('Cairo September 2026 (UTC+3 in DST) starts 21:00 UTC the day before', () => {
    expect(monthWindow('2026-09', 'Africa/Cairo')).toEqual({
      from: '2026-08-31T21:00:00.000Z',
      to: '2026-09-30T21:00:00.000Z',
    });
  });

  it('Riyadh December rolls into January', () => {
    expect(monthWindow('2026-12', 'Asia/Riyadh')).toEqual({
      from: '2026-11-30T21:00:00.000Z',
      to: '2026-12-31T21:00:00.000Z',
    });
  });
});

describe('linesOf (one line per length and frozen ledger amount)', () => {
  it('groups by (minutes, amount) and keeps a pro-rated length apart', () => {
    const lines = linesOf([lesson(45, 70), lesson(45, 70), lesson(45, 60), lesson(50, 77.78), lesson(30, null)]);
    expect(lines).toEqual([
      { duration: 45, lessons: 1, rate: 60, amount: 60 },
      { duration: 45, lessons: 2, rate: 70, amount: 140 },
      { duration: 50, lessons: 1, rate: 77.78, amount: 77.78 },
    ]);
  });
});

describe('planPayout (R-PAY-02: payable lessons × their ledger amount, EGP; E3 frozen once approved)', () => {
  it('a draft with the lines, the counted lesson ids and the statuses used', () => {
    const lessons = [lesson(45, 70), lesson(45, 70), lesson(90, 130)];
    expect(planPayout(base({ lessons }))).toEqual({
      kind: 'draft',
      id: null,
      lessonsCount: 3,
      amount: 2 * 70 + 130,
      breakdown: {
        lines: [
          { duration: 45, lessons: 2, rate: 70, amount: 140 },
          { duration: 90, lessons: 1, rate: 130, amount: 130 },
        ],
        lesson_ids: lessons.map((l) => l.id),
        statuses: ['completed'],
        skipped_lesson_ids: [],
      },
    });
  });

  it('regenerating a draft keeps its id (idempotent upsert)', () => {
    const plan = planPayout(base({ lessons: [lesson(45, 70)], existing: { id: 'p1', status: 'draft' } }));
    expect(plan).toMatchObject({ kind: 'draft', id: 'p1', amount: 70 });
  });

  it.each(['approved', 'paid'] as const)('%s rows are frozen', (status) => {
    expect(planPayout(base({ lessons: [lesson(45, 70)], existing: { id: 'p1', status } }))).toEqual({ kind: 'frozen' });
  });

  it('no payable lessons → no row; a stale draft is deleted', () => {
    expect(planPayout(base())).toEqual({ kind: 'clear', deleteId: null });
    expect(planPayout(base({ existing: { id: 'p1', status: 'draft' } }))).toEqual({ kind: 'clear', deleteId: 'p1' });
  });

  it('a lesson the teacher has no rate for skips the teacher (never paid 0)', () => {
    const plan = planPayout(base({ lessons: [lesson(60, null), lesson(45, 70), lesson(60, null)] }));
    expect(plan).toEqual({ kind: 'missing', durations: [60], deleteId: null });
  });

  it('an odd length is paid at its pro-rated ledger amount (no more skipped lessons)', () => {
    const plan = planPayout(base({ lessons: [lesson(50, 77.78), lesson(45, 70)] }));
    expect(plan).toMatchObject({ kind: 'draft', lessonsCount: 2, amount: 147.78 });
  });
});

describe('approveBlock (E3: an approved month is frozen, so it waits for the month and its reports)', () => {
  const monthEnd = '2026-09-30T21:00:00.000Z';
  it('the month is not over until its last local midnight', () => {
    expect(approveBlock({ monthEnd, now: new Date('2026-09-30T20:59:59Z'), pendingReports: 0, editedSince: 0 })).toBe('month_not_over');
    expect(approveBlock({ monthEnd, now: new Date(monthEnd), pendingReports: 0, editedSince: 0 })).toBeNull();
  });
  it('a missing report blocks; none → approvable', () => {
    expect(approveBlock({ monthEnd, now: new Date('2026-10-02T09:00:00Z'), pendingReports: 1, editedSince: 0 })).toBe('reports_pending');
    expect(approveBlock({ monthEnd, now: new Date('2026-10-02T09:00:00Z'), pendingReports: 0, editedSince: 0 })).toBeNull();
  });
  it('a lesson re-timed after the draft was calculated blocks until it is calculated again', () => {
    const now = new Date('2026-10-02T09:00:00Z');
    expect(approveBlock({ monthEnd, now, pendingReports: 0, editedSince: 1 })).toBe('payout_stale');
    expect(approveBlock({ monthEnd, now, pendingReports: 1, editedSince: 1 })).toBe('reports_pending');
  });
});
