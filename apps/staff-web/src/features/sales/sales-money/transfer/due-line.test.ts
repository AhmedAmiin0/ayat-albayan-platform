import { describe, expect, it } from 'vitest';
import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { dueLine } from './due-line';

describe('dueLine: what an open package still owes', () => {
  it('nothing paid yet: what is due', () => {
    expect(dueLine({ paid: 0, price: 81, due: 81, currency: 'SAR' })).toBe(t.salesMoney.due.replace('{amount}', moneyText(81, 'SAR')));
  });

  it('80 of 81 paid: the part-paid line (owner 2026-10-28)', () => {
    expect(dueLine({ paid: 80, price: 81, due: 1, currency: 'SAR' })).toBe('مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1');
  });
});
