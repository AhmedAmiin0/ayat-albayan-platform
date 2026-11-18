import { describe, expect, it } from 'vitest';
import { kid, lesson } from '@ab/web-kit/portal/portal.fixtures';
import { dayBadge, weekDates, weekTiles } from './week-days';

describe('the schedule week’s day tiles', () => {
  it('seven days from Saturday, across a month end', () => {
    expect(weekDates('2026-10-31')).toEqual([
      '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05',
      '2026-11-06',
    ]);
  });

  it('«اليوم» and «غدًا»; any other day none', () => {
    expect(dayBadge('2026-11-15', '2026-11-15')).toBe('today');
    expect(dayBadge('2026-11-16', '2026-11-15')).toBe('tomorrow');
    expect(dayBadge('2026-11-17', '2026-11-15')).toBeNull();
    expect(dayBadge('2026-11-14', '2026-11-15')).toBeNull();
  });

  it('every day gets a tile; the days with lessons keep them', () => {
    const entry = { student: kid(), lesson: lesson() };
    const tiles = weekTiles('2026-11-14', [{ day: '2026-11-16', lessons: [entry] }]);
    expect(tiles).toHaveLength(7);
    expect(tiles[2]).toEqual({ day: '2026-11-16', lessons: [entry] });
    expect(tiles.filter((d) => d.lessons.length === 0)).toHaveLength(6);
  });
});
