import { describe, expect, it } from 'vitest';
import { courseStopBody, offeredRefund, STOP_MONEY_START, stopMoney } from './course-stop-money.js';

// 8 lessons for 400 SAR, 3 attended at 100 %: charge 150.
const calc = (paid: number) => ({
  paid,
  perLesson: 50,
  attended: 3,
  ratePercent: 100,
  charged: 150,
  refund: Math.max(0, paid - 150),
});
const preview = (paid: number) => ({ paid, currency: 'SAR', owe: { charged: 150, price: 400 } });
const refunding = (paid: number, patch: Partial<typeof STOP_MONEY_START>) =>
  stopMoney({
    state: { ...STOP_MONEY_START, mode: 'refund', ...patch },
    preview: preview(paid),
    breakdown: calc(paid),
  });

describe('«إلغاء مع استرداد»: the refund choices × paid in full / partly paid', () => {
  it.each([
    [400, 'unattended', 250],
    [400, 'paid', 400],
    [200, 'unattended', 50],
    [200, 'paid', 200],
  ] as const)('paid %d, %s → refund %d, nothing left owed', (paid, refundChoice, n) => {
    const money = refunding(paid, { refundChoice });
    expect(money).toEqual({ ask: { refund: { choice: refundChoice } }, summary: { refund: n, due: 0 }, valid: true });
  });

  it('custom: 0 .. net paid; above it, empty or garbage is invalid', () => {
    expect(refunding(200, { refundChoice: 'custom', text: '١٢٠٫٥' }).ask).toEqual({
      refund: { choice: 'custom', amount: 120.5 },
    });
    expect(refunding(200, { refundChoice: 'custom', text: '0' }).valid).toBe(true);
    expect(refunding(200, { refundChoice: 'custom', text: '200' }).valid).toBe(true);
    expect(refunding(200, { refundChoice: 'custom', text: '200.01' }).valid).toBe(false);
    expect(refunding(200, { refundChoice: 'custom', text: '' }).valid).toBe(false);
    expect(refunding(200, { refundChoice: 'custom', text: 'abc' }).valid).toBe(false);
  });
});

describe('«إلغاء فقط»: what the family still owes', () => {
  const plain = (paid: number, patch: Partial<typeof STOP_MONEY_START> = {}) =>
    stopMoney({ state: { ...STOP_MONEY_START, ...patch }, preview: preview(paid), breakdown: calc(paid) });

  it.each([
    ['attended', 100, 50],
    ['price', 100, 300],
    ['nothing', 100, 0],
    ['attended', 400, 0],
  ] as const)('%s with %d paid → %d still due', (oweChoice, paid, due) => {
    expect(plain(paid, { oweChoice })).toEqual({ ask: { owe: { choice: oweChoice } }, summary: { refund: 0, due }, valid: true });
  });

  it('custom: 0 .. the price', () => {
    expect(plain(0, { oweChoice: 'custom', text: '275' })).toMatchObject({
      ask: { owe: { choice: 'custom', amount: 275 } },
      summary: { due: 275 },
      valid: true,
    });
    expect(plain(0, { oweChoice: 'custom', text: '400.01' }).valid).toBe(false);
    expect(plain(0, { oweChoice: 'custom', text: '' }).valid).toBe(false);
  });

  it('refund mode without the offer falls back to «إلغاء فقط»', () => {
    const state = { ...STOP_MONEY_START, mode: 'refund' as const };
    expect(stopMoney({ state, preview: preview(100), breakdown: null }).ask).toEqual({ owe: { choice: 'attended' } });
  });
});

describe('offeredRefund and the body', () => {
  it('needs the key and something paid (not only something left after the attended charge)', () => {
    expect(offeredRefund(true, calc(100))).toEqual(calc(100));
    expect(offeredRefund(false, calc(100))).toBeNull();
    expect(offeredRefund(true, calc(0))).toBeNull();
    expect(offeredRefund(true, null)).toBeNull();
  });

  it('the body carries the reason trimmed and the ask', () => {
    const base = { subscriptionId: 's', reason: ' سافر ', clientRequestId: 'r' };
    expect(courseStopBody({ ...base, ask: { owe: { choice: 'nothing' } } })).toEqual({
      subscriptionId: 's',
      reason: 'سافر',
      clientRequestId: 'r',
      owe: { choice: 'nothing' },
    });
  });
});
