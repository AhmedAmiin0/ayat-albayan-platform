import { t } from '@/lib/i18n';
import { checkPayDraft, type PayDraft } from './pay-draft';

const now = new Date('2026-10-03T10:00:00Z');
const draft = (patch: Partial<PayDraft> = {}): PayDraft => ({ amountText: '60', method: 'cash', daysAgo: 0, receipt: null, ...patch });
const ctx = { ceiling: 60, now, earningIds: ['e2'] };

test('a valid draft becomes the payment to send, with the ticked ids', () => {
  const r = checkPayDraft(draft(), ctx);
  expect(r.errors).toEqual({});
  expect(r.input).toEqual({ amount: 60, method: 'cash', paidAt: now.toISOString(), receipt: null, earningIds: ['e2'] });
});

test('Arabic digits are read; a partial amount is fine; an earlier day is noon Riyadh', () => {
  const r = checkPayDraft(draft({ amountText: '٢٥٫٥', daysAgo: 1 }), ctx);
  expect(r.input).toMatchObject({ amount: 25.5, paidAt: '2026-10-02T09:00:00.000Z' });
});

test('more than the ceiling is refused with the amount that is left', () => {
  const r = checkPayDraft(draft({ amountText: '60.01' }), ctx);
  expect(r.input).toBeUndefined();
  expect(r.errors.amount).toContain('60');
  expect(r.errors.amount).toBe(t.earnings.overpayment.replace('{amount}', r.errors.amount?.match(/\((.*)\)/)?.[1] ?? ''));
});

test('empty, unreadable and zero amounts, and a missing method, say why', () => {
  expect(checkPayDraft(draft({ amountText: ' ' }), ctx).errors.amount).toBe(t.common.required);
  expect(checkPayDraft(draft({ amountText: 'abc' }), ctx).errors.amount).toBe(t.payments.mobile.amountInvalid);
  expect(checkPayDraft(draft({ amountText: '0' }), ctx).errors.amount).toBe(t.payments.mobile.amountInvalid);
  const noMethod = checkPayDraft(draft({ method: undefined }), ctx);
  expect(noMethod.errors.method).toBe(t.common.required);
  expect(noMethod.input).toBeUndefined();
});

test('no ticks: ids are left out so the API pays oldest first', () => {
  expect(checkPayDraft(draft(), { ...ctx, earningIds: undefined }).input?.earningIds).toBeUndefined();
});
