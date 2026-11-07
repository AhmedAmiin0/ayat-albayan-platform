import { describe, expect, it } from 'vitest';
import { archiveName, archiveProps, dayLabel, msUntilUtcHour } from './labels';

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

  it('the next 01:00 UTC', () => {
    expect(msUntilUtcHour(new Date('2026-11-07T00:30:00Z'), 1)).toBe(30 * 60_000);
    expect(msUntilUtcHour(new Date('2026-11-07T01:00:00Z'), 1)).toBe(86_400_000);
  });
});
