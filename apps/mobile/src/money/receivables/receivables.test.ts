import { t } from '@/core/lib/i18n/i18n';
import { receivable } from '../shared/fixtures';
import { daysLateText, filterReceivables, fxMissingText, isSevere } from './receivables';

const rows = [
  receivable(),
  receivable({ id: 'sub2', student: { id: 's2', code: 'AB-0201', name: 'إبراهيم' }, guardian: null }),
  receivable({ id: 'sub3', student: { id: 's3', code: 'AB-0202', name: 'مريم' }, guardian: { name: 'أبو مريم', phone_e164: null } }),
];

test('no query keeps every row', () => {
  expect(filterReceivables(rows, '  ')).toHaveLength(3);
});

test('matches the student name with Arabic letter variants folded', () => {
  expect(filterReceivables(rows, 'ابراهيم').map((r) => r.id)).toEqual(['sub2']);
  expect(filterReceivables(rows, 'هدي').map((r) => r.id)).toEqual(['sub1']);
});

test('matches the AB-code in any case and the guardian name', () => {
  expect(filterReceivables(rows, 'ab-0201').map((r) => r.id)).toEqual(['sub2']);
  expect(filterReceivables(rows, 'أبو').map((r) => r.id)).toEqual(['sub3']);
});

test('a row without a guardian never throws', () => {
  expect(filterReceivables(rows, 'zzz')).toEqual([]);
});

test('late text and the 60-day line', () => {
  expect(daysLateText(34)).toBe(t.mobileMoney.daysLate.replace('{n}', '34'));
  expect([isSevere(60), isSevere(61)]).toEqual([false, true]);
});

test('the FX gap is worded only when a currency is missing', () => {
  expect(fxMissingText([])).toBeNull();
  expect(fxMissingText(['EGP', 'USD'])).toContain(`EGP${t.common.listSeparator}USD`);
});
