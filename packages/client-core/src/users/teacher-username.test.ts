import { describe, expect, it } from 'vitest';
import { ApiError, tidyUsername, usernameApiError, usernameChange } from '../index.js';

const text = { invalid: 'غير صالح', taken: 'مستخدم', needsLogin: 'أنشئ الحساب' };

describe('usernameChange', () => {
  it('sends nothing when unchanged (case and spaces ignored)', () => {
    expect(usernameChange('omar', ' Omar ', text)).toEqual({ ok: true, body: {} });
    expect(usernameChange(null, '', text)).toEqual({ ok: true, body: {} });
    expect(usernameChange(undefined, '  ', text)).toEqual({ ok: true, body: {} });
  });

  it('sends the lower-cased username when it changed', () => {
    expect(usernameChange(null, 'Ustadh.Omar', text)).toEqual({ ok: true, body: { username: 'ustadh.omar' } });
    expect(usernameChange('omar', 'omar_2', text)).toEqual({ ok: true, body: { username: 'omar_2' } });
  });

  it('sends null when cleared', () => {
    expect(usernameChange('omar', ' ', text)).toEqual({ ok: true, body: { username: null } });
  });

  it('rejects an invalid or student-code-like username', () => {
    for (const bad of ['1omar', 'om', 'AB-1234', 'عمر', 'omar!']) {
      expect(usernameChange(null, bad, text)).toEqual({ ok: false, error: 'غير صالح' });
    }
  });
});

describe('usernameApiError', () => {
  it('maps the two 409 codes', () => {
    expect(usernameApiError(new ApiError(409, { code: 'username_taken' }), text)).toBe('مستخدم');
    expect(usernameApiError(new ApiError(409, { code: 'username_needs_login' }), text)).toBe('أنشئ الحساب');
  });

  it('null for anything else', () => {
    expect(usernameApiError(new ApiError(409, { message: 'duplicate' }), text)).toBeNull();
    expect(usernameApiError(new ApiError(400, { code: 'username_taken' }), text)).toBeNull();
    expect(usernameApiError(new ApiError(409, null), text)).toBeNull();
    expect(usernameApiError(new Error('x'), text)).toBeNull();
  });
});

describe('tidyUsername', () => {
  it('trims and lower-cases', () => expect(tidyUsername('  Omar.A ')).toBe('omar.a'));
});
