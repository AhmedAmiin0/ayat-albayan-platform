import { describe, expect, it } from 'vitest';
import {
  fromMinor,
  minorScale,
  stopRefund,
  toMinor,
} from './stop-refund.js';

// «إلغاء مع استرداد» (owner 2026-11-02): refund = net paid − attended × price / lessons × rate.
const base = {
  paid: 400,
  price: 400,
  lessonsTotal: 8,
  attended: 3,
  ratePercent: 100,
  currency: 'SAR',
};

describe('stopRefund', () => {
  it('3 of 8 lessons at 100 %: 400 − 3 × 50 = 250', () => {
    expect(stopRefund(base)).toEqual({
      paid: 400,
      perLesson: 50,
      attended: 3,
      ratePercent: 100,
      charged: 150,
      refund: 250,
    });
  });

  it('0 attended refunds everything paid', () => {
    expect(stopRefund({ ...base, attended: 0 }).refund).toBe(400);
  });

  it('all attended refunds nothing', () => {
    expect(stopRefund({ ...base, attended: 8 })).toMatchObject({ charged: 400, refund: 0 });
  });

  it.each([
    [0, 0, 400],
    [100, 150, 250],
    [150, 225, 175],
    [300, 450, 0],
  ])('rate %i %%: charged %d, refund %d (floored at 0)', (ratePercent, charged, refund) => {
    expect(stopRefund({ ...base, ratePercent })).toMatchObject({ charged, refund });
  });

  it('a partly paid package: the refund never goes below 0', () => {
    expect(stopRefund({ ...base, paid: 100 }).refund).toBe(0);
    expect(stopRefund({ ...base, paid: 200 }).refund).toBe(50);
  });

  it('a negative net (refunded already) counts as 0 paid', () => {
    expect(stopRefund({ ...base, paid: -5 })).toMatchObject({ paid: 0, refund: 0 });
  });

  it('rounds once to the minor unit: 100 SAR / 3 lessons, 1 attended → 66.67', () => {
    const r = stopRefund({ ...base, paid: 100, price: 100, lessonsTotal: 3, attended: 1 });
    expect(r).toMatchObject({ perLesson: 33.33, charged: 33.33, refund: 66.67 });
  });

  it('KWD / OMR keep the 2 stored decimals: 10 KWD / 3, 1 attended at 150 % → 5 charged, 5 refund', () => {
    const r = stopRefund({
      ...base,
      paid: 10,
      price: 10,
      lessonsTotal: 3,
      attended: 1,
      ratePercent: 150,
      currency: 'KWD',
    });
    expect(r).toMatchObject({ perLesson: 3.33, charged: 5, refund: 5 });
    const o = stopRefund({
      ...base,
      paid: 10,
      price: 10,
      lessonsTotal: 3,
      attended: 1,
      currency: 'omr',
    });
    expect(o.refund).toBe(6.67);
  });

  it('a currency without decimals rounds to whole units', () => {
    const r = stopRefund({
      ...base,
      paid: 1000,
      price: 1000,
      lessonsTotal: 3,
      attended: 1,
      currency: 'JPY',
    });
    expect(r).toMatchObject({ perLesson: 333, charged: 333, refund: 667 });
  });

  it('a package of 0 lessons never divides by zero', () => {
    expect(stopRefund({ ...base, lessonsTotal: 0, attended: 0 }).refund).toBe(400);
  });

  it('USD and float noise: 0.1 + 0.2 paid', () => {
    expect(
      stopRefund({ ...base, paid: 0.1 + 0.2, price: 0.3, attended: 0, currency: 'USD' }).refund,
    ).toBe(0.3);
  });
});

describe('minor units', () => {
  it('scale per currency, 2 by default', () => {
    expect([
      minorScale('SAR'),
      minorScale('USD'),
      minorScale('KWD'),
      minorScale('JPY'),
      minorScale('XYZ'),
    ]).toEqual([100, 100, 100, 1, 100]);
    expect(toMinor(290.5, 'SAR')).toBe(29050);
    expect(toMinor(1.005, 'SAR')).toBe(101);
    expect(fromMinor(12345, 'KWD')).toBe(123.45);
  });
});
