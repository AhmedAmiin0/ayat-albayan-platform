import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { financeNotes, rateLines } from './finance-notes';
import type { DashboardData } from './types';

const finance = (over: Partial<DashboardData['finance']> = {}): DashboardData['finance'] => ({
  currency: 'SAR',
  revenue: 0,
  teacher_cost: 0,
  expenses: 0,
  gross_margin: 0,
  by_source: [],
  fx_date: null,
  fx_missing: [],
  by_month: [],
  expenses_by_category: { ads: 0, content: 0, tools: 0, operations: 0, other: 0 },
  fx_rates: { SAR: 1 },
  unrated_lessons: 0,
  ...over,
});

describe('financeNotes (R-RPT-02)', () => {
  it('nothing converted: says every amount is in the reporting currency', () => {
    expect(financeNotes(finance())).toEqual([
      { text: t.dashboard.allInCurrency.replace('{currency}', t.pricing.currencies.SAR), warn: false },
    ]);
  });

  it('converted: the currency and the rate date; gaps are warnings', () => {
    const notes = financeNotes(finance({ fx_date: '2026-10-01T00:00:00Z', fx_missing: ['KWD', 'OMR'], unrated_lessons: 3 }));
    expect(notes[0]?.text).toContain(t.pricing.currencies.SAR);
    expect(notes[0]?.warn).toBe(false);
    expect(notes[1]).toEqual({ text: t.dashboard.fxMissing.replace('{currencies}', 'KWD، OMR'), warn: true });
    expect(notes[2]).toEqual({ text: t.dashboard.unrated.few.replace('{n}', '3'), warn: true });
  });
});

describe('rateLines', () => {
  it('one line per converted currency, the reporting one left out', () => {
    expect(rateLines({ currency: 'SAR', fx_rates: { SAR: 1, USD: 0.266667, EGP: 13.2 } })).toEqual([
      `1 ${t.pricing.currencies.SAR} = 13.2 EGP`,
      `1 ${t.pricing.currencies.SAR} = 0.266667 ${t.pricing.currencies.USD}`,
    ]);
  });
});
