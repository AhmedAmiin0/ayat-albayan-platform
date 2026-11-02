import { paymentParams, subscriptionParams } from './filters';

test('subscriptions: «الكل» sends nothing but the name search', () => {
  expect(subscriptionParams('all', '')).toEqual({ status: undefined, paid: undefined, student: undefined });
  expect(subscriptionParams('all', 'هدى').student).toBe('هدى');
});

test('subscriptions: a status is status=, «مدفوعة جزئيًا» is paid=partial', () => {
  expect(subscriptionParams('unpaid', '')).toMatchObject({ status: 'unpaid', paid: undefined });
  expect(subscriptionParams('partial', '')).toMatchObject({ status: undefined, paid: 'partial' });
});

test('payments: all/all sends no filter', () => {
  expect(paymentParams('all', 'all')).toEqual({ kind: undefined });
});

test('payments: a type and a month become kind and the month`s two days', () => {
  expect(paymentParams('refund', '2026-09')).toEqual({ kind: 'refund', from: '2026-09-01', to: '2026-09-30' });
});
