import { describe, expect, it } from 'vitest';
import { subscriptionBalances, type PackageLesson } from './usage.js';

// Migration 932 (owner 2026-10-28): lessons taken before the platform count as used; the package fills
// with platform lessons only up to lessonsTotal − lessonsUsedBefore, then the next package takes over.
let seq = 0;
function done(day: string): PackageLesson {
  seq += 1;
  const lessonId = `b${String(seq).padStart(3, '0')}`;
  return { lessonId, startsAt: `${day}T07:00:00Z`, localDate: day, status: 'completed', chargeable: true, trial: false, makeup: false };
}
const A = { id: 'A', lessonsTotal: 8, lessonsUsedBefore: 1, startsOn: '2026-10-27', createdAt: '2026-10-27T00:00:00Z' };
const B = { id: 'B', lessonsTotal: 8, startsOn: '2026-11-20', createdAt: '2026-11-20T00:00:00Z' };

describe('subscriptionBalances with lessonsUsedBefore', () => {
  it('no platform lesson yet: 1 of 8 used, 7 left', () => {
    const [a] = subscriptionBalances({ lessons: [], subscriptions: [A] });
    expect(a).toMatchObject({ lessonsUsed: 1, remaining: 7, endedAt: null });
  });

  it('seven platform lessons use it up; the 7th ends it', () => {
    const days = ['01', '02', '03', '04', '05', '06', '07'].map((d) => done(`2026-11-${d}`));
    const [a] = subscriptionBalances({ lessons: days, subscriptions: [A] });
    expect(a).toMatchObject({ lessonsUsed: 8, remaining: 0, endedAt: '2026-11-07T07:00:00Z' });
  });

  it('the 8th platform lesson lands on the next package', () => {
    const days = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => done(`2026-11-${d}`));
    const [a, b] = subscriptionBalances({ lessons: days, subscriptions: [A, B] });
    expect(a).toMatchObject({ lessonsUsed: 8, remaining: 0 });
    expect(b).toMatchObject({ lessonsUsed: 1, remaining: 7 });
  });
});
