import { describe, expect, it } from 'vitest';
import { partChoices, partsByLesson, recordingMinutes, recordingMonths } from '.';

const rec = (id: string, lesson: string, at: string) => ({
  id, lesson_id: lesson, report_id: null, lesson_starts_at: at, teacher: null,
  duration_seconds: 60, size_bytes: null, media: 'audio' as const,
});

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

describe('recording months and parts', () => {
  it('groups by the family month and counts a lesson’s parts', () => {
    const rows = [
      rec('A', 'L1', '2026-11-15T14:00:00.000Z'),
      rec('B', 'L1', '2026-11-15T14:00:00.000Z'),
      rec('C', 'L2', '2026-10-30T22:30:00.000Z'),
    ];
    expect(recordingMonths(rows, 'Asia/Riyadh').map((m) => m.month)).toEqual(['2026-11', '2026-10']);
    expect(partsByLesson(rows).get('L1')).toBe(2);
  });
});
