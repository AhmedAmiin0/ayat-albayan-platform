import { t } from '@/core/lib/i18n/i18n';
import { balanceOf, OLD_SUB_ID, STUDENT, SUB_ID, subscription } from '../fixtures';
import { checkDraft, chosenPackage, defaultPackage, emptyDraft, payablePackages, withMethod } from './payment-form';
import type { Receipt } from '../receipt';

const now = new Date('2026-10-01T13:20:00Z');
const paidOld = subscription({ id: OLD_SUB_ID, starts_on: '2026-08-27', paid: 145, status: 'expired' });
const owedOld = subscription({ id: OLD_SUB_ID, starts_on: '2026-08-27', paid: 50, status: 'expired' });
const current = subscription();

test('payable: the current package and older ones still owed money', () => {
  expect(payablePackages(balanceOf(paidOld, current)).map((p) => p.id)).toEqual([SUB_ID]);
  expect(payablePackages(balanceOf(owedOld, current)).map((p) => p.id)).toEqual([OLD_SUB_ID, SUB_ID]);
  expect(payablePackages(balanceOf(subscription({ paid: 145 }))).map((p) => p.id)).toEqual([SUB_ID]);
});

test('default: the oldest owed package, else the current one; no package → null', () => {
  expect(defaultPackage(balanceOf(owedOld, current))?.id).toBe(OLD_SUB_ID);
  expect(defaultPackage(balanceOf(paidOld, current))?.id).toBe(SUB_ID);
  expect(defaultPackage(balanceOf(subscription({ paid: 145 })))?.id).toBe(SUB_ID);
  expect(defaultPackage(balanceOf())).toBeNull();
});

test('chosen: the picked payable package, else the default', () => {
  const balance = balanceOf(owedOld, current);
  expect(chosenPackage(balance, SUB_ID)?.id).toBe(SUB_ID);
  expect(chosenPackage(balance, undefined)?.id).toBe(OLD_SUB_ID);
  expect(chosenPackage(balanceOf(paidOld, current), OLD_SUB_ID)?.id).toBe(SUB_ID);
});

test('empty form: amount and method are required, nothing to send', () => {
  expect(checkDraft(emptyDraft, { sub: current, now })).toEqual({
    errors: { amount: t.common.required, method: t.common.required },
  });
});

test('a bad amount says how to type it', () => {
  const check = checkDraft({ ...emptyDraft, amountText: '1,500', method: 'bank' }, { sub: current, now });
  expect(check).toEqual({ errors: { amount: t.payments.mobile.amountInvalid } });
});

test('valid: the package currency, the picked day, Arabic digits read', () => {
  const draft = { ...emptyDraft, amountText: '٧٢٫٥', method: 'cash' as const, daysAgo: 1 };
  expect(checkDraft(draft, { sub: current, now })).toEqual({
    errors: {},
    input: {
      subscriptionId: SUB_ID,
      student: STUDENT,
      amount: 72.5,
      currency: 'SAR',
      method: 'cash',
      paidAt: '2026-09-30T09:00:00.000Z',
      receipt: null,
    },
  });
  expect(checkDraft({ ...draft, daysAgo: 0 }, { sub: current, now }).input?.paidAt).toBe(now.toISOString());
});

const slip: Receipt = { uri: 'file:///s.jpg', mime: 'image/jpeg', bytes: new ArrayBuffer(1), size: 1 };

test('attachments are a bank transfer\'s only: the slip moves in, leaving the bank drops them', () => {
  const bank = withMethod({ ...emptyDraft, receipt: slip }, 'bank');
  expect(bank).toMatchObject({ method: 'bank', receipt: null, attachments: [{ kind: 'file', receipt: slip }] });
  expect(withMethod(bank, 'cash')).toMatchObject({ method: 'cash', attachments: [] });
  const input = checkDraft({ ...bank, amountText: '10' }, { sub: current, now }).input;
  expect(input?.attachments).toEqual([{ kind: 'file', receipt: slip }]);
  expect(checkDraft({ ...bank, amountText: '10', method: 'cash' }, { sub: current, now }).input).not.toHaveProperty('attachments');
});

test('a cancelled package (owner 2026-10-28) is never payable nor the default, even with money «owed»', () => {
  const cancelled = subscription({ id: OLD_SUB_ID, starts_on: '2026-08-27', paid: 0, status: 'cancelled' });
  expect(payablePackages(balanceOf(cancelled, current)).map((p) => p.id)).toEqual([SUB_ID]);
  expect(defaultPackage(balanceOf(cancelled, current))?.id).toBe(SUB_ID);
  expect(chosenPackage(balanceOf(cancelled, current), OLD_SUB_ID)?.id).toBe(SUB_ID);
});
