import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { courseStopBody, refundAmountOf, stopRefundLines, stopRefundOf } from './course-refund.js';

const money = (n: number) => `${n} ر.س`;
const refund = {
  paid: 400,
  perLesson: 50,
  attended: 3,
  ratePercent: 150,
  charged: 225,
  refund: 175,
};

describe('stopRefundLines (MSA)', () => {
  it('paid, attended × price × rate, refund', () => {
    expect(stopRefundLines(ar.courseActions.stop, refund, money)).toEqual([
      'المدفوع: 400 ر.س',
      'الحلقات المحضورة: 3 × 50 ر.س × 150٪ = 225 ر.س',
      'المبلغ المستحق للاسترداد: 175 ر.س',
    ]);
  });
});

describe('refundAmountOf', () => {
  const max = { max: 175, currency: 'SAR' };
  it('empty = the computed refund; lower amounts pass', () => {
    expect(refundAmountOf('', max)).toBe(175);
    expect(refundAmountOf(' 100.5 ', max)).toBe(100.5);
    expect(refundAmountOf('١٢٠,٥', max)).toBe(120.5);
  });

  it('above the refund, zero or not a number: null', () => {
    expect(refundAmountOf('175.01', max)).toBeNull();
    expect(refundAmountOf('0', max)).toBeNull();
    expect(refundAmountOf('abc', max)).toBeNull();
    expect(refundAmountOf('-5', max)).toBeNull();
  });
});

describe('courseStopBody', () => {
  const base = { subscriptionId: 'p1', reason: '  سفر ', clientRequestId: 'r1' };
  it('«إلغاء فقط» sends no refund; «إلغاء مع استرداد» sends its amount', () => {
    expect(courseStopBody({ ...base, refund: null })).toEqual({
      subscriptionId: 'p1',
      reason: 'سفر',
      clientRequestId: 'r1',
    });
    expect(courseStopBody({ ...base, refund: 80 })).toEqual({
      subscriptionId: 'p1',
      reason: 'سفر',
      clientRequestId: 'r1',
      refund: { amount: 80 },
    });
  });
});

describe('stopRefundOf', () => {
  const refund = { max: 175, currency: 'SAR' };
  it('«إلغاء فقط» is always valid and refunds nothing', () => {
    expect(stopRefundOf({ choice: 'cancel', text: '999', refund })).toEqual({
      refund: null,
      valid: true,
    });
  });

  it('«إلغاء مع استرداد»: the typed amount, invalid above the cap', () => {
    expect(stopRefundOf({ choice: 'refund', text: '', refund })).toEqual({
      refund: 175,
      valid: true,
    });
    expect(stopRefundOf({ choice: 'refund', text: '200', refund })).toEqual({
      refund: null,
      valid: false,
    });
  });
});
