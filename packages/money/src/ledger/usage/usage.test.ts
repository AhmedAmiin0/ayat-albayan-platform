import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '@ab/catalog';
import { consumesPackage, subscriptionBalances, type PackageLesson } from './usage.js';

// The same scenario the migration 123 SQL check ran (begin … rollback on the local DB): a free
// trial, six completed lessons, an excuse and a teacher cancel that don't count, two booked.
let seq = 0;
function lesson(day: string, status: LessonStatus, extra: Partial<PackageLesson> = {}): PackageLesson {
  seq += 1;
  return {
    lessonId: `l${String(seq).padStart(3, '0')}`,
    startsAt: `${day}T07:00:00Z`,
    localDate: day,
    status,
    chargeable: !['excused', 'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'].includes(status),
    trial: false,
    makeup: false,
    ...extra,
  };
}
const sub = (id: string, lessonsTotal: number, at: { startsOn: string; createdAt?: string }) => ({
  id,
  lessonsTotal,
  startsOn: at.startsOn,
  createdAt: at.createdAt ?? '2026-09-01T00:00:00Z',
});

const LESSONS: PackageLesson[] = [
  lesson('2026-09-01', 'completed', { trial: true }),
  ...['02', '03', '04', '05', '06', '07'].map((d) => lesson(`2026-09-${d}`, 'completed')),
  lesson('2026-09-08', 'excused'),
  lesson('2026-09-09', 'cancelled_by_teacher'),
  lesson('2026-12-01', 'scheduled'),
  lesson('2026-12-02', 'confirmed'),
];

describe('consumesPackage (migration 123 rules 1–3, R-SUB-01, issue E1)', () => {
  const rows: [LessonStatus, boolean, boolean, boolean][] = [
    ['completed', true, false, true],
    ['late', true, false, true],
    ['no_show', true, false, true],
    ['excused', true, false, true], // a late cancel (isChargeable said so)
    ['excused', false, false, false], // an excuse in time
    ['completed', false, false, false], // an excused sibling inside a completed lesson
    ['completed', true, true, false], // the free trial
    ['scheduled', true, false, false], // not happened yet (chargeable is only the default)
    ['confirmed', true, false, false],
    ['cancelled_by_teacher', false, false, false],
    ['rescheduled', false, false, false],
  ];
  const cases = rows.map(([status, chargeable, trial, expected]) => ({ status, chargeable, trial, makeup: false, expected }));
  it.each(cases)('$status chargeable=$chargeable trial=$trial → $expected', (c) => {
    expect(consumesPackage(c)).toBe(c.expected);
  });
});

describe('subscriptionBalances: FIFO across packages (R-SUB-01, R-SUB-03, issue B5)', () => {
  it('no package → nothing to report', () => {
    expect(subscriptionBalances({ lessons: LESSONS, subscriptions: [] })).toEqual([]);
  });

  it('an early renewal starts only when the first package is used up', () => {
    const [a, b] = subscriptionBalances({
      lessons: LESSONS,
      subscriptions: [sub('B', 8, { startsOn: '2026-09-20', createdAt: '2026-09-20T00:00:00Z' }), sub('A', 4, { startsOn: '2026-09-01' })],
    });
    expect(a).toMatchObject({ subscriptionId: 'A', lessonsUsed: 4, remaining: 0, isLast: false });
    expect(a?.endedAt).toBe('2026-09-05T07:00:00Z');
    expect(a?.projectedEndAt).toBeNull();
    expect(b).toMatchObject({ subscriptionId: 'B', lessonsUsed: 2, remaining: 6, isLast: true });
    expect(b?.endedAt).toBeNull();
    expect(b?.projectedEndAt).toBeNull(); // 6 left, only 2 booked
  });

  it('projected end = the booked lesson that would use the last unit', () => {
    const [, b] = subscriptionBalances({
      lessons: LESSONS,
      subscriptions: [sub('A', 4, { startsOn: '2026-09-01' }), sub('B', 3, { startsOn: '2026-09-20', createdAt: '2026-09-20T00:00:00Z' })],
    });
    expect(b).toMatchObject({ lessonsUsed: 2, remaining: 1, projectedEndAt: '2026-12-01T07:00:00Z' });
  });

  it('overflow lands on the newest package: remaining goes negative, endedAt = last unit', () => {
    const [a, b] = subscriptionBalances({
      lessons: LESSONS,
      subscriptions: [sub('A', 4, { startsOn: '2026-09-01' }), sub('B', 1, { startsOn: '2026-09-20', createdAt: '2026-09-20T00:00:00Z' })],
    });
    expect(a?.remaining).toBe(0);
    expect(b).toMatchObject({ lessonsUsed: 2, remaining: -1, endedAt: '2026-09-06T07:00:00Z' });
  });

  it('lessons before the first package start do not count (the trial period)', () => {
    const [only] = subscriptionBalances({ lessons: LESSONS, subscriptions: [sub('A', 8, { startsOn: '2026-09-05' })] });
    expect(only).toMatchObject({ lessonsUsed: 3, remaining: 5 }); // Sept 5, 6, 7
  });

  it('same start day: the older purchase is used first; ties by id', () => {
    const balances = subscriptionBalances({
      lessons: LESSONS,
      subscriptions: [
        sub('Y', 4, { startsOn: '2026-09-01', createdAt: '2026-09-01T10:00:00Z' }),
        sub('X', 4, { startsOn: '2026-09-01', createdAt: '2026-09-01T10:00:00Z' }),
        sub('W', 4, { startsOn: '2026-09-01', createdAt: '2026-09-02T00:00:00Z' }),
      ],
    });
    expect(balances.map((b) => [b.subscriptionId, b.lessonsUsed])).toEqual([
      ['X', 4],
      ['Y', 2],
      ['W', 0],
    ]);
  });

  it('journey 2/3 seed: a 4-lesson package with one lesson done → 3 left; one more → 2', () => {
    const done = [lesson('2026-09-28', 'completed')];
    const today = lesson('2026-10-02', 'scheduled');
    const pkg = [sub('S', 4, { startsOn: '2026-09-27' })];
    expect(subscriptionBalances({ lessons: [...done, today], subscriptions: pkg })[0]?.remaining).toBe(3);
    const after = { ...today, status: 'completed' as const };
    expect(subscriptionBalances({ lessons: [...done, after], subscriptions: pkg })[0]?.remaining).toBe(2);
  });
});
