import { SETTING_DEFAULTS } from '@ab/settings';
import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { DashboardSettings } from '@/modules/reporting/dashboard/dashboard.settings';
import type { FinanceRepo } from './finance.repo';
import { FinanceService } from './finance.service';
import type { FxConverter } from './fx-converter';

const ROWS = [
  { kind: 'payment', month: '2026-10', currency: 'SAR', key: 'facebook_ad', amount: 145, n: 1 },
  { kind: 'cost', month: '2026-10', currency: 'EGP', key: 'unknown', amount: 130, n: 1 },
  { kind: 'expense', month: '2026-10', currency: 'EGP', key: 'ads', amount: 260, n: 1 },
  { kind: 'unrated', month: '', currency: '', key: '', amount: 0, n: 1 },
];

function service(over: { currency?: string } = {}) {
  const money = { totals: vi.fn().mockResolvedValue(ROWS) };
  const fx = {
    conversion: vi.fn().mockResolvedValue({
      currency: 'SAR',
      rates: { SAR: 1, EGP: 13 },
      missing: [],
      date: '2026-10-01T00:00:00Z',
    }),
  };
  const settings = readerOf(DashboardSettings, {
    reporting_currency: over.currency ?? SETTING_DEFAULTS.reporting_currency,
  });
  const svc = new FinanceService(
    money as unknown as FinanceRepo,
    fx as unknown as FxConverter,
    settings,
  );
  return { svc, money, fx };
}

const LEADS = [
  { source: 'facebook_ad' as const, status: 'converted' as const },
  { source: 'facebook_ad' as const, status: 'new' as const },
];

describe('FinanceService.finance (R-RPT-02)', () => {
  it('converts every amount to the reporting currency once, and records the rates and their date', async () => {
    const { svc, fx } = service();
    const f = await svc.finance({ range: { from: '2026-09-01', to: '2026-10-02' }, leads: LEADS });
    expect(fx.conversion).toHaveBeenCalledWith('SAR', new Set(['SAR', 'EGP']));
    expect(f).toMatchObject({
      currency: 'SAR',
      revenue: 145,
      teacher_cost: 10,
      expenses: 20,
      gross_margin: 115,
      fx_date: '2026-10-01T00:00:00Z',
      fx_missing: [],
      fx_rates: { SAR: 1, EGP: 13 },
      unrated_lessons: 1,
    });
    expect(f.by_month.map((m) => m.month)).toEqual(['2026-09', '2026-10']);
    expect(f.expenses_by_category.ads).toBe(20);
    expect(f.by_source[0]).toMatchObject({
      source: 'facebook_ad',
      leads: 2,
      converted: 1,
      revenue: 145,
    });
  });

  it('converts to the stored settings.reporting_currency', async () => {
    const { svc, fx } = service({ currency: 'EGP' });
    await svc.finance({ range: { from: '2026-09-01', to: '2026-10-02' }, leads: [] });
    expect(fx.conversion).toHaveBeenCalledWith('EGP', new Set(['SAR', 'EGP']));
  });

  it('reads the card with one aggregate call over the Riyadh window and its months', async () => {
    const { svc, money } = service();
    await svc.finance({ range: { from: '2026-09-15', to: '2026-10-02' }, leads: [] });
    expect(money.totals).toHaveBeenCalledTimes(1);
    expect(money.totals).toHaveBeenCalledWith({
      window: {
        from: new Date('2026-09-14T21:00:00.000Z'),
        to: new Date('2026-10-02T21:00:00.000Z'),
      },
      first: '2026-09',
      last: '2026-10',
    });
  });
});
