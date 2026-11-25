import { describe, expect, it } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { salesErrorText } from './errors';

describe('salesErrorText', () => {
  it('a «مبلغ مخصص» under the admin’s cap says so (owner 2026-11-02), not the generic line', () => {
    const e = new ApiError(400, { code: 'discount_too_large', min: 130.5, currency: 'SAR' });
    expect(salesErrorText(e)).toBe(t.paymentLinks.error.discount_too_large);
  });

  it('an unknown code is the generic line', () => {
    expect(salesErrorText(new ApiError(400, { code: 'nope' }))).toBe(t.salesMoney.error.generic);
  });
});
