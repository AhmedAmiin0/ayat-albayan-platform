import { describe, expect, it, vi } from 'vitest';
import type { SettingsService } from '../../common/settings/settings.service';
import { SETTING_DEFAULTS } from '../../common/settings/settings.values';
import type { FinanceQueries } from './finance.queries';
import { FinanceService } from './finance.service';
import type { FxConverter } from './fx-converter';

const RATES = { rate_30: 130, rate_45: null, rate_60: null, rate_90: null };
const at = { starts_at: '2026-10-01T16:00:00Z', ends_at: '2026-10-01T16:30:00Z' };

function service(over: { countLate?: boolean } = {}) {
  const money = {
    payments: vi.fn().mockResolvedValue([
      { amount: 145, currency: 'SAR', paid_at: '2026-10-01T10:00:00Z', subscription: { fx_rate: null, student: { guardian: { source: 'facebook_ad' } } } },
    ]),
    paidLessons: vi.fn().mockResolvedValue([
      { ...at, id: 'l1', teacher: RATES, lesson_students: [] },
      { ...at, id: 'l2', ends_at: '2026-10-01T17:00:00Z', teacher: RATES, lesson_students: [] },
    ]),
    frozenPayouts: vi.fn().mockResolvedValue([]),
    expenses: vi.fn().mockResolvedValue([{ id: 'e', month: '2026-10-01', category: 'ads', amount: 260, currency: 'EGP' }]),
  };
  const fx = {
    conversion: vi.fn().mockResolvedValue({ currency: 'SAR', rates: { SAR: 1, EGP: 13 }, missing: [], date: '2026-10-01T00:00:00Z' }),
  };
  const settings = { all: vi.fn().mockResolvedValue({ ...SETTING_DEFAULTS, payout_count_late: over.countLate ?? false }) };
  const svc = new FinanceService(
    money as unknown as FinanceQueries,
    fx as unknown as FxConverter,
    settings as unknown as SettingsService,
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

  it('paid lessons follow the payout settings; expenses span the range months', async () => {
    const { svc, money } = service({ countLate: true });
    await svc.finance({ range: { from: '2026-09-15', to: '2026-10-02' }, leads: [] });
    expect(money.paidLessons.mock.calls[0]?.[1]).toEqual(['completed', 'late']);
    expect(money.expenses).toHaveBeenCalledWith('2026-09', '2026-10');
    expect(money.frozenPayouts).toHaveBeenCalledWith('2026-08-01', '2026-11-01');
  });
});
