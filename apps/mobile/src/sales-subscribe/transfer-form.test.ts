import { t } from '@/lib/i18n';
import { openSub, SUB } from './fixtures';
import { checkTransfer, currencyChoices, draftFor, type ReceiptChoice } from './transfer-form';

const NOW = new Date('2026-10-12T09:00:00Z');
const sub = openSub({ due: 72.5 });
const chat: ReceiptChoice = { kind: 'chat', messageId: 'm-1', path: `${SUB}/a.jpg` };

test('prefilled: the due amount in the package currency, today, no receipt', () => {
  expect(draftFor(sub)).toEqual({ amountText: '72.5', currency: 'SAR', daysAgo: 0, note: '', receipt: null });
});

test('the package currency first, then the others once', () => {
  expect(currencyChoices('SAR')).toEqual(['SAR', 'AED', 'QAR', 'KWD', 'OMR', 'USD']);
  expect(currencyChoices('EGP')[0]).toBe('EGP');
  expect(currencyChoices('EGP')).toHaveLength(7);
});

test('the receipt is required; a bad amount is refused', () => {
  const none = checkTransfer(draftFor(sub), { sub, now: NOW });
  expect(none.input).toBeUndefined();
  expect(none.errors).toEqual({ receipt: t.salesMoney.receiptRequired });
  const zero = checkTransfer({ ...draftFor(sub), amountText: '0', receipt: chat }, { sub, now: NOW });
  expect(zero.errors).toEqual({ amount: t.salesMoney.error.amount });
});

test('a complete transfer: Arabic digits, yesterday, a trimmed note', () => {
  const draft = { ...draftFor(sub), amountText: '١٨٠', daysAgo: 1, note: '  من حساب الأب ', receipt: chat };
  expect(checkTransfer(draft, { sub, now: NOW }).input).toEqual({
    subscriptionId: SUB,
    amount: 180,
    currency: 'SAR',
    paidAt: '2026-10-11T09:00:00.000Z',
    note: 'من حساب الأب',
    receipt: chat,
  });
  expect(checkTransfer({ ...draft, note: ' ' }, { sub, now: NOW }).input?.note).toBeNull();
});
