import { describe, expect, it } from 'vitest';
import { subscriptionBalances, type PackageLesson } from './usage.js';

// Migration 991 (PR #464 review): a stopped package keeps the lessons it used at the stop. The next
// package's lessons never land on it; its unused lessons are forfeited (remaining = total − used).
let seq = 0;
function done(day: string): PackageLesson {
  seq += 1;
  const lessonId = `s${String(seq).padStart(3, '0')}`;
  return { lessonId, startsAt: `${day}T07:00:00Z`, localDate: day, status: 'completed', chargeable: true, trial: false, makeup: false };
}
const A = { id: 'A', lessonsTotal: 8, startsOn: '2026-10-01', createdAt: '2026-10-01T00:00:00Z' };
const B = { id: 'B', lessonsTotal: 8, startsOn: '2026-11-01', createdAt: '2026-11-01T00:00:00Z' };
const held = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-11-02', '2026-11-03'].map(done);

describe('subscriptionBalances with a stopped package', () => {
  it('A stopped at 3 of 8, B holds 2: A (3, 5, not last), B (2, 6, last)', () => {
    const subs = [{ ...A, lessonsUsedAtStop: 3 }, B];
    const [a, b] = subscriptionBalances({ lessons: held, subscriptions: subs });
    expect(a).toMatchObject({ lessonsUsed: 3, remaining: 5, isLast: false, endedAt: '2026-10-04T07:00:00Z' });
    expect(b).toMatchObject({ lessonsUsed: 2, remaining: 6, isLast: true });
  });

  it('not stopped, A would soak up B’s lessons (the bug the freeze fixes)', () => {
    const [a, b] = subscriptionBalances({ lessons: held, subscriptions: [A, B] });
    expect(a).toMatchObject({ lessonsUsed: 5, remaining: 3 });
    expect(b).toMatchObject({ lessonsUsed: 0, remaining: 8 });
  });

  it('lessons taken before the platform still count: stopped at 4 with 1 before keeps 3 platform lessons', () => {
    const subs = [{ ...A, lessonsUsedBefore: 1, lessonsUsedAtStop: 4 }, B];
    const [a, b] = subscriptionBalances({ lessons: held, subscriptions: subs });
    expect(a).toMatchObject({ lessonsUsed: 4, remaining: 4 });
    expect(b).toMatchObject({ lessonsUsed: 2, remaining: 6 });
  });
});
