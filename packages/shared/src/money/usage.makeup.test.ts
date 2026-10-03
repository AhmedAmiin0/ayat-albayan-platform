import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '../enums/index.js';
import { consumesPackage, subscriptionBalances, type PackageLesson } from './usage.js';

// R-SCH-10, migration 172: a makeup replaces a miss the package already charged, so it never
// consumes a unit and never moves the projected end date.
let seq = 0;
function lesson(day: string, status: LessonStatus, extra: Partial<PackageLesson> = {}): PackageLesson {
  seq += 1;
  return {
    lessonId: `m${String(seq).padStart(3, '0')}`,
    startsAt: `${day}T07:00:00Z`,
    localDate: day,
    status,
    chargeable: true,
    trial: false,
    makeup: false,
    ...extra,
  };
}
const A = { id: 'A', lessonsTotal: 4, startsOn: '2026-09-01', createdAt: '2026-09-01T00:00:00Z' };

describe('a makeup lesson never consumes a package unit', () => {
  it.each(['completed', 'late', 'no_show', 'excused'] as const)('%s + chargeable + makeup → no unit', (status) => {
    expect(consumesPackage({ status, chargeable: true, trial: false, makeup: true })).toBe(false);
  });

  it('the miss uses its unit; the completed makeup uses none', () => {
    const lessons = [
      lesson('2026-09-02', 'completed'),
      lesson('2026-09-03', 'no_show'),
      lesson('2026-09-10', 'completed', { makeup: true }),
    ];
    const [a] = subscriptionBalances({ lessons, subscriptions: [A] });
    expect(a).toMatchObject({ lessonsUsed: 2, remaining: 2 });
  });

  it('a booked makeup does not move the projected end date either', () => {
    const lessons = [
      lesson('2026-09-02', 'completed'),
      lesson('2026-09-03', 'completed'),
      lesson('2026-09-04', 'no_show'),
      lesson('2026-09-11', 'scheduled', { makeup: true }),
      lesson('2026-09-18', 'scheduled'),
    ];
    const [a] = subscriptionBalances({ lessons, subscriptions: [A] });
    expect(a).toMatchObject({ lessonsUsed: 3, remaining: 1, projectedEndAt: '2026-09-18T07:00:00Z' });
  });
});
