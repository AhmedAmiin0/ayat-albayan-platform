import { describe, expect, it, vi } from 'vitest';
import { currentPackages, packageSummaries, toPackageSummary } from './sales-package.mapper';
import type { RosterBalanceRow, RosterPackageRow } from './sales-roster.repo';

/** As the database could return it, with money columns present: none may leave. */
const row = (id: string, over: Partial<RosterPackageRow> = {}): RosterPackageRow =>
  ({
    id, student_id: 's1', package: '8', status: 'active', starts_on: '2026-10-01',
    renews_on: '2026-11-01', lessons_total: 8, created_at: '2026-09-30T10:00:00Z', price: 290, currency: 'SAR', notes: 'سر', ...over,
  }) as RosterPackageRow;
const bal = (id: string, over: Partial<RosterBalanceRow> = {}): RosterBalanceRow => ({
  subscription_id: id, lessons_used: 3, remaining: 5, ended_at: null, projected_end_at: null,
  ...over,
});

describe('currentPackages', () => {
  it('per student: the newest active one, else the newest not cancelled; none when all cancelled', () => {
    const rows = [
      row('a2', { status: 'paused' }), row('a1'),
      row('b2', { student_id: 's2', status: 'cancelled' }), row('b1', { student_id: 's2', status: 'expired' }),
      row('c1', { student_id: 's3', status: 'cancelled' }),
    ];
    const out = currentPackages(rows);
    expect([...out].map(([id, r]) => [id, r.id])).toEqual([['s1', 'a1'], ['s2', 'b1']]);
  });
});

describe('toPackageSummary', () => {
  it('names every field: the balance\'s used / left / end, never a price, currency or note', () => {
    const out = toPackageSummary(row('a1'), bal('a1', { projected_end_at: '2026-11-20T08:00:00Z' }));
    expect(out).toEqual({
      id: 'a1', package: '8', status: 'active', starts_on: '2026-10-01', renews_on: '2026-11-01',
      ended_at: null, projected_end_at: '2026-11-20T08:00:00Z', created_at: '2026-09-30T10:00:00Z',
      lessons_total: 8, lessons_used: 3, lessons_remaining: 5,
    });
    expect(JSON.stringify(out)).not.toMatch(/price|currency|SAR|290|سر/);
  });

  it('without a balance row: nothing used, the whole package left, no end', () => {
    expect(toPackageSummary(row('a1'))).toMatchObject({
      lessons_used: 0, lessons_remaining: 8, ended_at: null, projected_end_at: null,
    });
  });
});

describe('packageSummaries', () => {
  it('reads the balances of the current packages only, once', async () => {
    const repo = { balances: vi.fn(async () => [bal('a1'), bal('b1', { lessons_used: 8, remaining: 0 })]) };
    const rows = [row('a2', { status: 'cancelled' }), row('a1'), row('b1', { student_id: 's2', status: 'expired' })];
    const out = await packageSummaries(repo, rows);
    expect(repo.balances).toHaveBeenCalledTimes(1);
    expect(repo.balances).toHaveBeenCalledWith(['a1', 'b1']);
    expect(out.get('s1')?.lessons_remaining).toBe(5);
    expect(out.get('s2')).toMatchObject({ status: 'expired', lessons_used: 8, lessons_remaining: 0 });
  });
});
