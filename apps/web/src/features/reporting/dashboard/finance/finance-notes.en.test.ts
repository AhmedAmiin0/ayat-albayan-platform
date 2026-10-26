import en from '@ab/shared/i18n/en.json';
import { describe, expect, it, vi } from 'vitest';
import { financeNotes } from './finance-notes';
import type { DashboardData } from '../types';

// The UI in English: lists join with en.json's «, » (the Arabic default is covered next door).
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));

const finance: DashboardData['finance'] = {
  currency: 'SAR',
  revenue: 0,
  teacher_cost: 0,
  expenses: 0,
  gross_margin: 0,
  by_source: [],
  fx_date: '2026-10-01T00:00:00Z',
  fx_missing: ['KWD', 'OMR'],
  by_month: [],
  expenses_by_category: { ads: 0, content: 0, tools: 0, operations: 0, other: 0 },
  fx_rates: { SAR: 1 },
  unrated_lessons: 0,
};

describe('financeNotes in English', () => {
  it('joins the missing currencies with the English list joiner', () => {
    expect(en.common.listSeparator).toBe(', ');
    expect(financeNotes(finance)[1]).toEqual({
      text: en.dashboard.fxMissing.replace('{currencies}', 'KWD, OMR'),
      warn: true,
    });
  });
});
