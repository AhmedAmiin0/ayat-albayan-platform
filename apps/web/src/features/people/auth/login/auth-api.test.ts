import { ApiError } from '@ab/client-core';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { signInErrorText } from './auth-api';

vi.mock('@/lib/http/api', () => ({ apiFetch: vi.fn(), apiSend: vi.fn() }));

const err = (status: number, code: string) => new ApiError(status, { code });

describe('signInErrorText', () => {
  it('maps the API codes to familyAuth.errors', () => {
    expect(signInErrorText(err(401, 'invalid_code'))).toBe(t.familyAuth.errors.invalid_code);
    expect(signInErrorText(err(401, 'invalid_credentials'))).toBe(t.familyAuth.errors.invalid_credentials);
    expect(signInErrorText(err(409, 'phone_belongs_to_staff'))).toBe(t.familyAuth.errors.phone_belongs_to_staff);
    expect(signInErrorText(err(429, 'too_many_requests'))).toBe(t.familyAuth.errors.too_many_requests);
    expect(signInErrorText(err(503, 'codes_unavailable'))).toBe(t.familyAuth.errors.codes_unavailable);
  });

  it('password rules reuse the users texts', () => {
    expect(signInErrorText(err(400, 'password_too_short'))).toBe(t.users.errors.password_too_short);
    expect(signInErrorText(err(400, 'password_too_long'))).toBe(t.users.errors.password_too_long);
    expect(signInErrorText(err(400, 'password_blank'))).toBe(t.users.errors.password_blank);
  });

  it('a disabled account says so; anything else is the generic error', () => {
    expect(signInErrorText(err(403, 'account_disabled'))).toBe(t.users.errors.account_disabled);
    expect(signInErrorText(err(500, 'boom'))).toBe(t.common.error);
    expect(signInErrorText(new Error('offline'))).toBe(t.common.error);
  });
});
