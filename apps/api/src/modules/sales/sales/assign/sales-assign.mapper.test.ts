import { pickSales } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { toCandidates } from './sales-assign.mapper';

const lead = (assigned_to: string | null, status: string, updated_at: string) => ({ assigned_to, status, updated_at });

describe('toCandidates', () => {
  it('open = not converted / lost; last assigned = the newest updated_at of anything assigned; never = null', () => {
    const c = toCandidates(['a', 'b', 'c'], [
      lead('a', 'new', '2026-10-01T10:00:00Z'),
      lead('a', 'converted', '2026-10-02T10:00:00Z'),
      lead('a', 'lost', '2026-09-01T10:00:00Z'),
      lead('b', 'trial_booked', '2026-10-03T10:00:00Z'),
      lead(null, 'new', '2026-10-04T10:00:00Z'),
    ]);
    expect(c).toEqual([
      { id: 'a', openLeads: 1, lastAssignedAt: '2026-10-02T10:00:00.000Z' },
      { id: 'b', openLeads: 1, lastAssignedAt: '2026-10-03T10:00:00.000Z' },
      { id: 'c', openLeads: 0, lastAssignedAt: null },
    ]);
  });

  it('feeds pickSales: least loaded first, then longest since the last lead', () => {
    const c = toCandidates(['a', 'b'], [lead('a', 'new', '2026-10-01T10:00:00Z'), lead('b', 'new', '2026-10-02T10:00:00Z')]);
    expect(pickSales(c)).toBe('a');
    expect(pickSales(toCandidates([], []))).toBeNull();
  });
});
