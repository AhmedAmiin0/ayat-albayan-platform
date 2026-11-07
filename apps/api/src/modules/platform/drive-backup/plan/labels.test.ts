import { describe, expect, it } from 'vitest';
import { archiveName, dayLabel, isoWeekday, msUntilUtcHour, weekLabel } from './labels';

describe('archive labels', () => {
  it.each([
    ['2026-11-07', '2026-W45'],
    ['2026-01-01', '2026-W01'],
    ['2027-01-01', '2026-W53'],
    ['2024-12-30', '2025-W01'],
  ])('%s is in ISO week %s', (day, week) => {
    expect(weekLabel(new Date(`${day}T12:00:00Z`))).toBe(week);
  });

  it('days, weekdays and names', () => {
    expect(dayLabel(new Date('2026-11-07T23:59:00Z'))).toBe('2026-11-07');
    expect(isoWeekday(new Date('2026-11-13T01:00:00Z'))).toBe(5);
    expect(isoWeekday(new Date('2026-11-08T01:00:00Z'))).toBe(7);
    expect(archiveName({ kind: 'incr', label: '2026-11-07', part: 1 })).toBe(
      'incr-2026-11-07.tar.zst',
    );
    expect(archiveName({ kind: 'full', label: '2026-W45', part: 3 })).toBe(
      'full-2026-W45.p3.tar.zst',
    );
  });

  it('the next 01:00 UTC', () => {
    expect(msUntilUtcHour(new Date('2026-11-07T00:30:00Z'), 1)).toBe(30 * 60_000);
    expect(msUntilUtcHour(new Date('2026-11-07T01:00:00Z'), 1)).toBe(86_400_000);
  });
});
