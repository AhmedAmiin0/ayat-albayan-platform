import { describe, expect, it } from 'vitest';
import { approveBlock, byDuration, monthWindow, planPayout, type PayoutLesson, type PlanInput } from './payouts.plan';

const MIN = 60_000;
let seq = 0;
const lesson = (minutes: number, status: PayoutLesson['status'] = 'completed'): PayoutLesson => {
  const start = Date.parse('2026-09-10T15:00:00Z') + (seq += 1) * 86_400_000;
  return {
    id: `l${seq}`,
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(start + minutes * MIN).toISOString(),
    status,
  };
};
const teacher = { id: 't1', tz: 'Africa/Cairo', rate_30: 50, rate_45: 70, rate_60: 90, rate_90: 130 };
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

describe('byDuration', () => {
  it('counts each standard length and sets odd lengths apart, never rounded', () => {
    const a = lesson(45);
    const b = lesson(45);
    const c = lesson(30);
    const odd = lesson(50);
    const r = byDuration([a, b, c, odd]);
    expect(r.counts).toEqual({ 45: 2, 30: 1 });
    expect(r.counted).toEqual([a.id, b.id, c.id]);
    expect(r.skipped).toEqual([odd.id]);
  });
});

describe('planPayout (R-PAY-02: completed lessons × rate, EGP; E3 frozen once approved)', () => {
  it('a draft with the lines, the counted lesson ids and the statuses used', () => {
    const lessons = [lesson(45), lesson(45), lesson(90)];
    const plan = planPayout(base({ lessons }));
    expect(plan).toEqual({
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
    const plan = planPayout(base({ lessons: [lesson(45)], existing: { id: 'p1', status: 'draft' } }));
    expect(plan).toMatchObject({ kind: 'draft', id: 'p1', amount: 70 });
  });

  it.each(['approved', 'paid'] as const)('%s rows are frozen', (status) => {
    expect(planPayout(base({ lessons: [lesson(45)], existing: { id: 'p1', status } }))).toEqual({ kind: 'frozen' });
  });

  it('late / no-show are left out unless the settings count them', () => {
    const lessons = [lesson(45), lesson(45, 'late'), lesson(45, 'no_show')];
    expect(planPayout(base({ lessons }))).toMatchObject({ lessonsCount: 1 });
    expect(planPayout(base({ lessons, statuses: ['completed', 'late'] }))).toMatchObject({ lessonsCount: 2 });
  });

  it('no paid lessons → no row; a stale draft is deleted', () => {
    expect(planPayout(base())).toEqual({ kind: 'clear', deleteId: null });
    const stale = planPayout(base({ lessons: [lesson(45, 'cancelled_by_teacher')], existing: { id: 'p1', status: 'draft' } }));
    expect(stale).toEqual({ kind: 'clear', deleteId: 'p1' });
  });

  it('a duration taught without a rate skips the teacher (never paid 0)', () => {
    const plan = planPayout(base({ teacher: { ...teacher, rate_60: null }, lessons: [lesson(60), lesson(45)] }));
    expect(plan).toEqual({ kind: 'missing', durations: [60], deleteId: null });
  });

  it('only odd-length lessons → a zero draft that lists them for the admin', () => {
    const odd = lesson(50);
    const plan = planPayout(base({ lessons: [odd] }));
    expect(plan).toMatchObject({ kind: 'draft', lessonsCount: 0, amount: 0 });
    expect(plan.kind === 'draft' && plan.breakdown.skipped_lesson_ids).toEqual([odd.id]);
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
