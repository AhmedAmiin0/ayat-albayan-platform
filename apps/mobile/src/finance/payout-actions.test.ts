import { APPROVED, PAID, PAYOUT } from './fixtures';
import { dueOf, payBody, payoutActions } from './payout-actions';

test('actions follow the state like the web page', () => {
  expect(payoutActions(PAYOUT)).toEqual(['approve']);
  expect(payoutActions(APPROVED)).toEqual(['pay', 'reopen']);
  expect(payoutActions(PAID)).toEqual(['receipt', 'unpay']);
  expect(payoutActions({ status: 'paid', has_receipt: false })).toEqual(['unpay']);
});

test('the due line is the amount minus what the ledger paid, never below zero', () => {
  expect(dueOf(APPROVED)).toBe(1500);
  expect(dueOf(PAYOUT)).toBe(1600);
  expect(dueOf({ amount: 100, ledger_paid: 150 })).toBe(0);
  expect(dueOf({ amount: 10.3, ledger_paid: 0.1 })).toBe(10.2);
});

test('the pay body: today is now, an earlier day is 12:00 Riyadh, a blank note is null', () => {
  const now = new Date('2026-10-05T09:00:00Z');
  const draft = { method: 'bank' as const, daysAgo: 0, note: '  ', receipt: null };
  expect(payBody(draft, null, now)).toEqual({ paidAt: now.toISOString(), method: 'bank', note: null, receiptPath: null });
  expect(payBody({ ...draft, daysAgo: 2, note: ' تحويل ' }, 'tr/a.jpg', now)).toEqual({
    paidAt: '2026-10-03T09:00:00.000Z',
    method: 'bank',
    note: 'تحويل',
    receiptPath: 'tr/a.jpg',
  });
});
