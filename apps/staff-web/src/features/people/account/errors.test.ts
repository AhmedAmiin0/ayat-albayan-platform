import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { domainError, invalid } from './account-test-kit';
import { accountErrors, accountMessage } from './errors';

const E = t.account.errors;

describe('accountErrors — API errors of /me at their field (R-ACC-01..05)', () => {
  it.each([
    ['wrong_password', 400, { current_password: E.wrong_password }],
    ['password_same', 400, { new_password: E.password_same }],
    ['phone_taken', 409, { phone_e164: E.phone_taken }],
    ['email_taken', 409, { email: E.email_taken }],
    ['avatar_too_large', 400, { avatar: E.avatar_too_large }],
  ] as const)('domain code %s', (code, status, expected) => {
    expect(accountErrors(domainError(status, code))).toEqual(expected);
  });

  it('validation_failed: phone reasons read as invalid_phone at the phone field', () => {
    expect(accountErrors(invalid('phone_e164', 'missing_country_code'))).toEqual({ phone_e164: E.invalid_phone });
  });

  it('validation_failed: a code goes to its field, an unknown message falls back to the path', () => {
    expect(accountErrors(invalid('full_name', 'name_too_short'))).toEqual({ full_name: E.name_too_short });
    expect(accountErrors(new ApiError(400, { message: 'validation_failed', issues: [{ path: 'email', message: 'odd' }] }))).toEqual({
      email: E.generic,
    });
  });

  it('anything else is a form-level generic message', () => {
    expect(accountErrors(new Error('network'))).toEqual({ form: E.generic });
    expect(accountErrors(new ApiError(500, null))).toEqual({ form: E.generic });
    expect(accountErrors(domainError(400, 'mystery'))).toEqual({ form: E.generic });
    expect(accountErrors(new ApiError(400, { message: 'validation_failed', issues: [] }))).toEqual({ form: E.generic });
  });

  it('accountMessage: known code, phone reason, unknown', () => {
    expect(accountMessage('email_taken')).toBe(E.email_taken);
    expect(accountMessage('not_a_number')).toBe(E.invalid_phone);
    expect(accountMessage('nope')).toBe(E.generic);
  });
});
