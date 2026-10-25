import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { accountErrors, accountMessage } from './account-errors';

const e = t.account.errors;

describe('accountErrors (R-ACC-02..05)', () => {
  test('a domain code lands under its field', () => {
    expect(accountErrors(new ApiError(400, { code: 'wrong_password', message: 'x' }))).toEqual({ current_password: e.wrong_password });
    expect(accountErrors(new ApiError(409, { code: 'phone_taken', message: 'x' }))).toEqual({ phone_e164: e.phone_taken });
    expect(accountErrors(new ApiError(409, { code: 'email_taken', message: 'x' }))).toEqual({ email: e.email_taken });
    expect(accountErrors(new ApiError(400, { code: 'password_same', message: 'x' }))).toEqual({ new_password: e.password_same });
    expect(accountErrors(new ApiError(400, { code: 'avatar_too_large', message: 'x' }))).toEqual({ avatar: e.avatar_too_large });
  });

  test('validation_failed: each issue under the field of its path; phone reasons read invalid_phone', () => {
    const body = {
      message: 'validation_failed',
      issues: [
        { path: ['phone_e164'], message: 'missing_country_code' },
        { path: 'full_name', message: 'name_too_short' },
        { path: [], message: 'empty_update' },
      ],
    };
    expect(accountErrors(new ApiError(400, body))).toEqual({
      phone_e164: e.invalid_phone,
      full_name: e.name_too_short,
      form: e.generic,
    });
  });

  test('the first issue of a field wins', () => {
    const body = { message: 'validation_failed', issues: [{ path: ['email'], message: 'invalid_email' }, { path: ['email'], message: 'other' }] };
    expect(accountErrors(new ApiError(400, body))).toEqual({ email: e.invalid_email });
  });

  test('network, 5xx or an unknown code: generic under the fallback (the photo says re-upload)', () => {
    expect(accountErrors(new TypeError('Network request failed'))).toEqual({ form: e.generic });
    expect(accountErrors(new ApiError(500, { code: 'boom' }))).toEqual({ form: e.generic });
    expect(accountErrors(new Error('storage'), 'avatar')).toEqual({ avatar: e.avatar_path });
  });

  test('accountMessage maps every phone reason and falls back to generic', () => {
    for (const reason of ['empty', 'not_a_number', 'invalid_length', 'missing_country_code']) {
      expect(accountMessage(reason)).toBe(e.invalid_phone);
    }
    expect(accountMessage('nope')).toBe(e.generic);
  });
});
