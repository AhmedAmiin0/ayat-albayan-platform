import { describe, expect, it } from 'vitest';
import { boardWindow } from './board-window';

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
