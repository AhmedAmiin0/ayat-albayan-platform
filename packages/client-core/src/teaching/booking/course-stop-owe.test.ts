import { describe, expect, it } from 'vitest';
import { offeredOwe, oweOptions } from './course-refund.js';
import { mayLowerOwe } from './course-stop-money.js';

// Review 2026-11-06: lowering what is owed below attended × rate (nothing, a smaller custom
// amount) is a refund holder's call on this student; the sheets hide it from everyone else.
const words = {
  refundUnattended: '',
  refundAll: '',
  refundCustom: '',
  oweAttended: 'attended {amount}',
  owePrice: 'price {amount}',
  oweNothing: 'nothing',
  oweCustom: 'custom',
  summary: '',
};
const options = oweOptions(words, { charged: 150, price: 400 }, String);
const values = (mayLower: boolean) => offeredOwe(options, mayLower).map((o) => o.value);
const lines = { refund: null, refundUnavailable: false };
const calc = { paid: 290, perLesson: 50, attended: 3, ratePercent: 100, charged: 150, refund: 140 };

describe('offeredOwe', () => {
  it('everything for whom may lower; attended and the price for everyone else', () => {
    expect(values(true)).toEqual(['attended', 'price', 'nothing', 'custom']);
    expect(values(false)).toEqual(['attended', 'price']);
  });
});

describe('mayLowerOwe', () => {
  it('the key and the server showing refund lines here (or saying they are unreadable)', () => {
    expect(mayLowerOwe(true, { ...lines, refund: calc })).toBe(true);
    expect(mayLowerOwe(true, { ...lines, refundUnavailable: true })).toBe(true);
    expect(mayLowerOwe(true, lines)).toBe(false);
    expect(mayLowerOwe(false, { ...lines, refund: calc })).toBe(false);
    expect(mayLowerOwe(true, undefined)).toBe(false);
  });
});
