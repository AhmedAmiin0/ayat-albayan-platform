import { describe, expect, it } from 'vitest';
import { packageStarts } from './sales-roster.mapper';
import type { RosterPackageRow } from './sales-roster.repo';

// Tuesday 27 October 2026, 13:00 in Riyadh.
const NOW = new Date('2026-10-27T10:00:00Z');
const pkg = (id: string, starts_on: string, status: RosterPackageRow['status'] = 'active') =>
  ({ id, student_id: 's1', starts_on, status }) as RosterPackageRow;
const riyadhMidnight = (day: string): number => Date.parse(`${day}T00:00:00+03:00`);

describe('packageStarts: the package in use (oldest first, never a future start)', () => {
  it('an early renewal dated today or later: counts from the older package', () => {
    const rows = [pkg('future', '2026-11-15'), pkg('today', '2026-10-27'), pkg('old', '2026-10-01')];
    expect(packageStarts(rows, NOW).get('s1')).toBe(riyadhMidnight('2026-10-01'));
  });

  it('a package dated today counts once it is the only one started', () => {
    const rows = [pkg('future', '2026-11-15'), pkg('today', '2026-10-27')];
    expect(packageStarts(rows, NOW).get('s1')).toBe(riyadhMidnight('2026-10-27'));
  });

  it('only a future active package: no start (the recent basis)', () => {
    expect(packageStarts([pkg('future', '2026-11-15')], NOW).has('s1')).toBe(false);
  });

  it('a package that is not active never counts', () => {
    const rows = [pkg('done', '2026-09-01', 'expired'), pkg('now', '2026-10-01')];
    expect(packageStarts(rows, NOW).get('s1')).toBe(riyadhMidnight('2026-10-01'));
  });
});
