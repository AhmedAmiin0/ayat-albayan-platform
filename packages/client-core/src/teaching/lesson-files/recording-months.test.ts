import { describe, expect, it } from 'vitest';
import { partChoices, recordingMinutes } from '.';

describe('recordingMinutes', () => {
  it('rounds to whole minutes; unknown reads 0', () => {
    expect(recordingMinutes(2640)).toBe('44');
    expect(recordingMinutes(null)).toBe('0');
  });
});

describe('partChoices', () => {
  it('names the parts oldest first with their length', () => {
    const rows = [{ id: 'B', duration_seconds: 780 }, { id: 'A', duration_seconds: 1860 }];
    const words = { partOption: 'الجزء {n} · {minutes} دقيقة' };
    expect(partChoices(rows, words).map((c) => [c.value, c.label])).toEqual([
      ['A', 'الجزء 1 · 31 دقيقة'],
      ['B', 'الجزء 2 · 13 دقيقة'],
    ]);
  });
});
