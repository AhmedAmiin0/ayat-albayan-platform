import { describe, expect, it } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { boardWindow, weekLessons } from './board-window';

describe('boardWindow (docs/46 D4)', () => {
  it('14 local days back and 14 ahead, at her midnights', () => {
    const w = boardWindow('2026-10-03', 'Africa/Cairo');
    expect(w.from.toISOString()).toBe('2026-09-18T21:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-10-16T21:00:00.000Z');
  });

  it('across the end of summer time the window stays at local midnights (one API call)', () => {
    const w = boardWindow('2026-10-25', 'Africa/Cairo');
    expect(w.to.toISOString()).toBe('2026-11-07T22:00:00.000Z');
    expect(w.to.getTime() - w.from.getTime()).toBeLessThanOrEqual(31 * 86_400_000);
  });
});

describe('weekLessons', () => {
  it('keeps the rolling week from today in her zone', () => {
    const list = [
      lesson({ id: 'before', starts_at: '2026-10-02T20:00:00.000Z' }),
      lesson({ id: 'today', starts_at: '2026-10-02T21:00:00.000Z' }),
      lesson({ id: 'last', starts_at: '2026-10-09T20:59:00.000Z' }),
      lesson({ id: 'after', starts_at: '2026-10-09T21:00:00.000Z' }),
    ];
    const ids = weekLessons(list, { today: '2026-10-03', tz: 'Africa/Cairo' }).map((l) => l.id);
    expect(ids).toEqual(['today', 'last']);
  });
});
