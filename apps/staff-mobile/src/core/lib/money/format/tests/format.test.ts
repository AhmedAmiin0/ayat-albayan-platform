import { t, ltr } from '@ab/mobile-kit';
import { subscription } from '@/payments/fixtures';
import { instantDay, localDay, packageFrom, packageName, paidOf, usedOf } from '@/core/lib/money/format/format';

const SAR = t.pricing.currencies.SAR;

test('packageName: the catalog size, or the count for a custom package', () => {
  expect(packageName({ package: '8', lessons_total: 8 })).toBe(t.enums.packageSize['8']);
  expect(packageName({ package: null, lessons_total: 10 })).toBe('10 حلقات');
  expect(packageName({ package: null, lessons_total: 2 })).toBe('حلقتان');
});

test('instantDay is the Riyadh day; localDay keeps the stored date', () => {
  // 22:30Z on 30 Sep is 01:30 on 1 Oct in Riyadh.
  expect(instantDay('2026-09-30T22:30:00Z', 'Asia/Riyadh')).toBe('1 أكتوبر 2026');
  expect(localDay('2026-10-01')).toBe('1 أكتوبر 2026');
});

test('package, paid and used lines', () => {
  const sub = subscription({ paid: 72.5 });
  expect(packageFrom(sub)).toBe(`${t.enums.packageSize['4']} · من 24 سبتمبر 2026`);
  expect(paidOf(sub)).toBe(`دُفع ${ltr('72.5')} من ${ltr(String(sub.price))} ${SAR}`);
  expect(usedOf(sub)).toBe('2 من 4 حلقة');
});
