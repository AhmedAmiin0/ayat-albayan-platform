import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { minAmountText } from '@/features/sales/payment-links';
import { linkStepErrorText, salesErrorText } from './errors';

describe('salesErrorText', () => {
  it('a «مبلغ مخصص» under the admin’s cap says so (owner 2026-11-02), not the generic line', () => {
    const e = new ApiError(400, { code: 'discount_too_large', min: 130.5, currency: 'SAR' });
    expect(salesErrorText(e)).toBe(t.paymentLinks.error.discount_too_large);
  });

  it('a link amount under the floor names the lowest amount, never the pills’ line', () => {
    const body = { code: 'discount_not_allowed', min: 153, currency: 'SAR' };
    expect(linkStepErrorText(new ApiError(403, body))).toBe(minAmountText(153, 'SAR'));
    const pill = new ApiError(403, { code: 'discount_not_allowed' });
    expect(linkStepErrorText(pill)).toBe(t.paymentLinks.error.discount_not_allowed);
  });

  it('an unknown code is the generic line', () => {
    expect(salesErrorText(new ApiError(400, { code: 'nope' }))).toBe(t.salesMoney.error.generic);
  });
});
