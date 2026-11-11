import { describe, expect, it } from 'vitest';
import { archiveName, archiveProps, dayLabel, msUntilUtcWeekly } from './labels';

describe('archive labels', () => {
  it('the UTC day and the part names', () => {
    expect(dayLabel(new Date('2026-11-07T23:59:00Z'))).toBe('2026-11-07');
    expect(archiveName({ label: '2026-11-07', part: 1 })).toBe('add-2026-11-07.p1.tar.zst');
    expect(archiveName({ label: '2026-11-07', part: 12 })).toBe('add-2026-11-07.p12.tar.zst');
  });

  it('the marker on every archive', () => {
    expect(archiveProps({ label: '2026-11-07', part: 2 })).toEqual({
      ab_source: 'platform',
      ab_backup: 'minio',
      label: '2026-11-07',
      part: '2',
    });
  });

  it('the next Friday 01:00 UTC', () => {
    const at = { weekday: 5, hour: 1 };
    const day = 86_400_000;
    const from = (iso: string) => msUntilUtcWeekly(new Date(iso), at);
    expect(from('2026-11-13T00:30:00Z')).toBe(30 * 60_000); // Friday, before
    expect(from('2026-11-13T01:00:00Z')).toBe(7 * day); // exactly on it
    expect(from('2026-11-13T02:00:00Z')).toBe(7 * day - 3_600_000); // Friday, after
    expect(from('2026-11-12T23:00:00Z')).toBe(2 * 3_600_000); // Thursday night
    expect(from('2026-11-07T00:30:00Z')).toBe(6 * day + 30 * 60_000); // Saturday
  });
});
