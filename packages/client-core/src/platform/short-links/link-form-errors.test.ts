import { describe, expect, it } from 'vitest';
import { ApiError } from '../../core/http';
import { issueErrors, linkServerErrors } from './link-form-errors';

describe('issueErrors', () => {
  it('keeps the first problem per field, by zod path or dotted path', () => {
    expect(
      issueErrors([
        { path: ['title'], message: 'Too small' },
        { path: 'phones.1', message: 'invalid' },
        { path: ['profileIds'], message: 'users_required' },
        { path: ['title'], message: 'Too big' },
        { path: [], message: 'x' },
      ]),
    ).toEqual({
      title: 'title_invalid', phones: 'phone_invalid', people: 'users_required', form: 'generic',
    });
  });
});

describe('linkServerErrors', () => {
  it('maps the domain codes to their field', () => {
    expect(linkServerErrors(new ApiError(400, { code: 'target_not_allowed' }))).toEqual({
      targetUrl: 'target_not_allowed',
    });
    expect(linkServerErrors(new ApiError(400, { code: 'invalid_expiry' }))).toEqual({
      expiresAt: 'expiry_invalid',
    });
    expect(linkServerErrors(new ApiError(404, { code: 'short_link_not_found' }))).toEqual({
      form: 'not_found',
    });
  });

  it('maps the validation issues', () => {
    const body = { message: 'validation_failed', issues: [{ path: 'maxUsers', message: 'x' }] };
    expect(linkServerErrors(new ApiError(400, body))).toEqual({ maxUsers: 'max_users_invalid' });
  });

  it('falls back to the form line', () => {
    expect(linkServerErrors(new ApiError(500))).toEqual({ form: 'generic' });
    expect(linkServerErrors(new TypeError('offline'))).toEqual({ form: 'generic' });
  });
});
