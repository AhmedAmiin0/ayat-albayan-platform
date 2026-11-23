import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../http/index.js';
import { createAuthExit, isAccountDisabled } from './auth-exit.js';

const disabled = () => new ApiError(403, { code: 'account_disabled' });

function exitWith() {
  const leave = { resolve: (): void => undefined };
  const signOut = vi.fn(() => new Promise<void>((r) => (leave.resolve = r)));
  const onDisabled = vi.fn();
  return { exit: createAuthExit({ signOut, onDisabled }), signOut, onDisabled, leave };
}

describe('isAccountDisabled', () => {
  it('only a 403 whose body carries code account_disabled', () => {
    expect(isAccountDisabled(disabled())).toBe(true);
    expect(isAccountDisabled(new ApiError(403, { code: 'other' }))).toBe(false);
    expect(isAccountDisabled(new ApiError(403, 'account_disabled'))).toBe(false);
    expect(isAccountDisabled(new ApiError(403))).toBe(false);
    expect(isAccountDisabled(new ApiError(401, { code: 'account_disabled' }))).toBe(false);
    expect(isAccountDisabled(new TypeError('offline'))).toBe(false);
  });
});

describe('createAuthExit', () => {
  it('a 401 signs out without the disabled notice', () => {
    const s = exitWith();
    s.exit(new ApiError(401));
    expect(s.signOut).toHaveBeenCalledTimes(1);
    expect(s.onDisabled).not.toHaveBeenCalled();
  });

  it('a disabled account leaves its notice, then signs out', () => {
    const s = exitWith();
    s.exit(disabled());
    expect(s.onDisabled).toHaveBeenCalledTimes(1);
    expect(s.signOut).toHaveBeenCalledTimes(1);
  });

  it('another 403, a 404, a 500 or a lost connection keep the session', () => {
    const s = exitWith();
    for (const e of [new ApiError(403), new ApiError(404), new ApiError(500), new TypeError('x')]) {
      s.exit(e);
    }
    expect(s.signOut).not.toHaveBeenCalled();
  });

  it('a 401 the API answers with a code (a wrong or missing code) keeps the session', () => {
    const s = exitWith();
    s.exit(new ApiError(401, { code: 'invalid_code', message: 'invalid_code' }));
    s.exit(new ApiError(401, { code: 'code_required' }));
    expect(s.signOut).not.toHaveBeenCalled();
    s.exit(new ApiError(401, { statusCode: 401, message: 'Unauthorized' }));
    expect(s.signOut).toHaveBeenCalledTimes(1);
  });

  it('many 401s at once sign out once; a later session can sign out again', async () => {
    const s = exitWith();
    s.exit(new ApiError(401));
    s.exit(new ApiError(401));
    s.exit(disabled());
    expect(s.signOut).toHaveBeenCalledTimes(1);
    s.leave.resolve();
    await vi.waitFor(() => {
      s.exit(new ApiError(401));
      expect(s.signOut).toHaveBeenCalledTimes(2);
    });
  });

  it('a failed sign-out frees the next try', async () => {
    const signOut = vi.fn(() => Promise.reject(new Error('offline')));
    const exit = createAuthExit({ signOut });
    exit(new ApiError(401));
    await vi.waitFor(() => {
      exit(new ApiError(401));
      expect(signOut).toHaveBeenCalledTimes(2);
    });
  });
});
