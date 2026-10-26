import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { DashboardSettings } from '../dashboard.settings';
import type { FinanceQueries } from './finance.queries';
import { FinanceService } from './finance.service';
import type { FxConverter } from './fx-converter';

const at = '2026-10-01T16:00:00Z';

function service(over: { countLate?: boolean; currency?: string } = {}) {
  const money = {
    payments: vi.fn().mockResolvedValue([
      { amount: 145, currency: 'SAR', paid_at: '2026-10-01T10:00:00Z', subscription: { fx_rate: null, student: { guardian: { source: 'facebook_ad' } } } },
    ]),
    payableLessons: vi.fn().mockResolvedValue([
      { lesson_id: 'l1', starts_at: at, amount: 130 },
      { lesson_id: 'l2', starts_at: at, amount: null },
    ]),
    lessonSources: vi.fn().mockResolvedValue([]),
    expenses: vi.fn().mockResolvedValue([{ id: 'e', month: '2026-10-01', category: 'ads', amount: 260, currency: 'EGP' }]),
  };
  const fx = {
    conversion: vi.fn().mockResolvedValue({ currency: 'SAR', rates: { SAR: 1, EGP: 13 }, missing: [], date: '2026-10-01T00:00:00Z' }),
  };
  const { countLate = false, currency = SETTING_DEFAULTS.reporting_currency } = over;
  const settings = readerOf(DashboardSettings, { payout_count_late: countLate, reporting_currency: currency });
  const svc = new FinanceService(
    money as unknown as FinanceQueries,
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
    expect(f.by_source[0]).toMatchObject({ source: 'facebook_ad', leads: 2, converted: 1, revenue: 145 });
  });

  it('converts to the stored settings.reporting_currency', async () => {
    const { svc, fx } = service({ currency: 'EGP' });
    await svc.finance({ range: { from: '2026-09-01', to: '2026-10-02' }, leads: [] });
    expect(fx.conversion).toHaveBeenCalledWith('EGP', new Set(['SAR', 'EGP']));
  });

  it('teacher cost reads the one pay rule (payable lessons); sources only for costed lessons', async () => {
    const { svc, money } = service({ countLate: true });
    await svc.finance({ range: { from: '2026-09-15', to: '2026-10-02' }, leads: [] });
    expect(money.payableLessons).toHaveBeenCalledTimes(1);
    expect(money.lessonSources).toHaveBeenCalledWith(['l1']);
    expect(money.expenses).toHaveBeenCalledWith('2026-09', '2026-10');
  });
});
