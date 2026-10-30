import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '../../../enums/index.js';
import { consumesPackage, subscriptionBalances, type PackageLesson } from './usage.js';

// Migration 190: a حلقة فورية (instant lesson) is ad hoc and never consumes a package unit, even
// once an outcome rewrote lesson_students.chargeable to true.
let seq = 0;
function lesson(day: string, status: LessonStatus, extra: Partial<PackageLesson> = {}): PackageLesson {
  seq += 1;
  return {
    lessonId: `i${String(seq).padStart(3, '0')}`,
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

describe('an instant lesson never consumes a package unit', () => {
  it.each(['completed', 'late', 'no_show', 'excused'] as const)('%s + chargeable + instant → no unit', (status) => {
    expect(consumesPackage({ status, chargeable: true, trial: false, makeup: false, instant: true })).toBe(false);
    expect(consumesPackage({ status, chargeable: true, trial: false, makeup: false })).toBe(true);
  });

  it('the completed instant lesson uses no unit and does not move the projected end', () => {
    const lessons = [
      lesson('2026-09-02', 'completed'),
      lesson('2026-09-03', 'completed', { instant: true }),
      lesson('2026-09-04', 'scheduled', { instant: true }),
      lesson('2026-09-09', 'scheduled'),
      lesson('2026-09-16', 'scheduled'),
      lesson('2026-09-23', 'scheduled'),
    ];
    const [a] = subscriptionBalances({ lessons, subscriptions: [A] });
    expect(a).toMatchObject({ lessonsUsed: 1, remaining: 3, projectedEndAt: '2026-09-23T07:00:00Z' });
  });
});
