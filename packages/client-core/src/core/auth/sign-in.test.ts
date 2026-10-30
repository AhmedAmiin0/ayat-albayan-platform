import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../http/index.js';
import { isEmailIdentifier, signInApi, signInError } from './sign-in.js';

describe('signInApi (docs/30 §6)', () => {
  it('calls the public routes with their bodies', async () => {
    const apiFetch = vi.fn().mockResolvedValue({ available: true });
    const apiSend = vi.fn().mockResolvedValue(undefined);
    const api = signInApi({ apiFetch, apiSend });
    await expect(api.codeStatus()).resolves.toEqual({ available: true });
    await api.requestCode('+966500000001');
    await api.verifyCode({ phone: '+966500000001', code: '123456' });
    await api.login({ username: 'AB-1234', password: 'secret-1' });
    await api.forgot({ identifier: 'omar' });
    await api.reset({ identifier: 'omar', code: '123456', password: 'secret-2' });
    expect(apiFetch).toHaveBeenCalledWith('/auth/code/status');
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/auth/code/request', { phone: '+966500000001' }],
      ['POST', '/auth/code/verify', { phone: '+966500000001', code: '123456' }],
      ['POST', '/auth/login', { username: 'AB-1234', password: 'secret-1' }],
      ['POST', '/auth/password/forgot', { identifier: 'omar' }],
      ['POST', '/auth/password/reset', { identifier: 'omar', code: '123456', password: 'secret-2' }],
    ]);
  });

  it('sends an email to GoTrue, anything else to /auth/login', () => {
    expect(isEmailIdentifier('a@b.co')).toBe(true);
    expect(isEmailIdentifier('AB-1234')).toBe(false);
  });

  it('maps known failure codes and nothing else', () => {
    expect(signInError(new ApiError(401, { code: 'invalid_code' }))).toBe('invalid_code');
    expect(signInError(new ApiError(429, { code: 'too_many_requests' }))).toBe('too_many_requests');
    expect(signInError(new ApiError(400, { code: 'password_too_short', min: 8 }))).toBe('password_too_short');
    expect(signInError(new ApiError(500, { code: 'boom' }))).toBeNull();
    expect(signInError(new ApiError(500, null))).toBeNull();
    expect(signInError(new Error('x'))).toBeNull();
  });
});
