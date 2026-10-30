import { describe, expect, it } from 'vitest';
import { isRetryableWaError, isWaAuthError, isWaPaymentHold } from './wa.js';

// 131042 «Business eligibility payment issue» is account-level: held by the sender, never failed.
describe('isWaPaymentHold', () => {
  it('only 131042 is a payment hold', () => {
    expect(isWaPaymentHold(131042)).toBe(true);
    for (const code of [null, undefined, 131026, 131031, 131047, 130429, 190, 368]) {
      expect(isWaPaymentHold(code)).toBe(false);
    }
  });

  it('a payment hold is neither a retryable error nor a token error', () => {
    expect(isRetryableWaError(131042)).toBe(false);
    expect(isWaAuthError(131042)).toBe(false);
  });
});
