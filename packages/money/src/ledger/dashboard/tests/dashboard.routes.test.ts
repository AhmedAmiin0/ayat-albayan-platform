import { describe, expect, it } from 'vitest';
import { dashboardRoutes as routes } from '..';
import { SUMMARY, WORK } from './dashboard.fixtures';

describe('dashboardRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /dashboard/summary', 'GET /dashboard/work']);
  });

  it('lets in dashboard readers only and files both under the dashboard tag', () => {
    expect(Object.values(routes).map((r) => r.permissions)).toEqual([
      ['dashboard.read'],
      ['dashboard.read'],
    ]);
    expect(Object.values(routes).map((r) => r.tags)).toEqual([['dashboard'], ['dashboard']]);
  });

  it('asks for Riyadh days and names a bad range by its own code', () => {
    expect(routes.summary.query.parse({ from: '2026-11-01', to: '2026-11-30' })).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
    const backwards = routes.summary.query.safeParse({ from: '2026-11-30', to: '2026-11-01' });
    expect(backwards.error?.issues[0]?.message).toBe('invalid_range');
    const long = routes.summary.query.safeParse({ from: '2025-01-01', to: '2026-11-30' });
    expect(long.error?.issues[0]?.message).toBe('range_too_large');
  });

  it('answers the summary with every count and its money', () => {
    expect(routes.summary.response.parse(SUMMARY)).toEqual(SUMMARY);
  });

  it('refuses a summary with an unknown source or a missing status count', () => {
    const tv = { ...SUMMARY.finance.by_source[0], source: 'tv' };
    const finance = { ...SUMMARY.finance, by_source: [tv] };
    expect(routes.summary.response.safeParse({ ...SUMMARY, finance }).success).toBe(false);
    const funnel = Object.fromEntries(Object.entries(SUMMARY.funnel).filter(([k]) => k !== 'new'));
    expect(routes.summary.response.safeParse({ ...SUMMARY, funnel }).success).toBe(false);
  });

  it('answers the work queue with its three lists', () => {
    expect(routes.work.response.parse(WORK)).toEqual(WORK);
  });

  it('refuses an unpaid row with an unknown reason or an undated pending report', () => {
    const unpaid = { ...WORK.unpaid, items: [{ ...WORK.unpaid.items[0], reason: 'late' }] };
    expect(routes.work.response.safeParse({ ...WORK, unpaid }).success).toBe(false);
    const row = { ...WORK.pending_reports.items[0], starts_at: 'soon' };
    const pending_reports = { total: 1, items: [row] };
    expect(routes.work.response.safeParse({ ...WORK, pending_reports }).success).toBe(false);
  });
});
