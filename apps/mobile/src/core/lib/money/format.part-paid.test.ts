import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { partPaidLine, shortfallLine } from './format';

// Owner 2026-10-28 («Why is this unpaid»): 81 SAR with 80 received stays unpaid; the line says why.
const SAR = t.pricing.currencies.SAR;

test('80 of 81: «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1», Western digits isolated', () => {
  expect(partPaidLine({ paid: 80, price: 81, currency: 'SAR' })).toBe(
    t.packagePayment.partPaid
      .replace('{paid}', ltr('80'))
      .replace('{price}', ltr('81'))
      .replace('{currency}', SAR)
      .replace('{due}', ltr('1')),
  );
});

test('nothing paid, or all of it: no part-paid line', () => {
  expect(partPaidLine({ paid: 0, price: 81, currency: 'SAR' })).toBeNull();
  expect(partPaidLine({ paid: 81, price: 81, currency: 'SAR' })).toBeNull();
  expect(partPaidLine({ paid: 90, price: 81, currency: 'SAR' })).toBeNull();
});

test('a receipt of 80 against 81 due warns by 1; one that covers it, or no amount yet, says nothing', () => {
  expect(shortfallLine({ amount: 80, due: 81, currency: 'SAR' })).toBe(
    t.packagePayment.shortfall.replace('{amount}', ltr('1')).replace('{currency}', SAR),
  );
  expect(shortfallLine({ amount: 81, due: 81, currency: 'SAR' })).toBeNull();
  expect(shortfallLine({ amount: 100, due: 81, currency: 'SAR' })).toBeNull();
  expect(shortfallLine({ amount: null, due: 81, currency: 'SAR' })).toBeNull();
});
