import { t } from '@/core/lib/i18n/i18n';
import { openSub, SUB } from './fixtures';
import { checkTransfer, draftFor, type ReceiptChoice } from './transfer-form';

const NOW = new Date('2026-10-12T09:00:00Z');
const sub = openSub({ due: 72.5 });
const chat: ReceiptChoice = { kind: 'chat', messageId: 'm-1', path: `${SUB}/a.jpg` };

test('prefilled: the due amount in the package currency, today, no attachment', () => {
  expect(draftFor(sub)).toEqual({ amountText: '72.5', daysAgo: 0, note: '', attachments: [] });
});

test('always the package currency, never another', () => {
  const egp = openSub({ currency: 'EGP' });
  expect(checkTransfer(draftFor(egp), { sub: egp, now: NOW }).input?.currency).toBe('EGP');
});

test('no attachment is fine (owner 2026-10-12); a bad amount is refused', () => {
  const none = checkTransfer(draftFor(sub), { sub, now: NOW });
  expect(none.errors).toEqual({});
  expect(none.input?.attachments).toEqual([]);
  const zero = checkTransfer({ ...draftFor(sub), amountText: '0', attachments: [chat] }, { sub, now: NOW });
  expect(zero.input).toBeUndefined();
  expect(zero.errors).toEqual({ amount: t.salesMoney.error.amount });
});

test('a complete transfer: Arabic digits, yesterday, a trimmed note, its attachments', () => {
  const draft = { ...draftFor(sub), amountText: '١٨٠', daysAgo: 1, note: '  من حساب الأب ', attachments: [chat] };
  expect(checkTransfer(draft, { sub, now: NOW }).input).toEqual({
    subscriptionId: SUB,
    amount: 180,
    currency: 'SAR',
    paidAt: '2026-10-11T09:00:00.000Z',
    note: 'من حساب الأب',
    attachments: [chat],
  });
  expect(checkTransfer({ ...draft, note: ' ' }, { sub, now: NOW }).input?.note).toBeNull();
});
