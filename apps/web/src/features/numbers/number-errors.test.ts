import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { numberErrorCode, numberErrorText } from './number-errors';

describe('numberErrorText', () => {
  it('a known 409 code reads in words', () => {
    expect(numberErrorCode(new ApiError(409, { message: 'phone_taken' }))).toBe('phone_taken');
    expect(numberErrorText(new ApiError(409, { message: 'parity_not_empty' }))).toBe(t.numbers.errors.parity_not_empty);
  });

  it('anything else is the generic error', () => {
    expect(numberErrorCode(new ApiError(409, { message: 'other' }))).toBeNull();
    expect(numberErrorCode(new ApiError(500, 'boom'))).toBeNull();
    expect(numberErrorText(new Error('down'))).toBe(t.numbers.errors.generic);
  });
});
