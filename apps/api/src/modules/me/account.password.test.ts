import { describe, expect, it } from 'vitest';
import { accountKit, ME, PASSWORD } from './account.fakes';

// R-ACC-04: the rules of users.password / AUTH_PASSWORD_MIN_LENGTH; the session is not revoked.

describe('PUT /me/password (R-ACC-04)', () => {
  it('sets the new password after checking the current one', async () => {
    const kit = accountKit();
    await kit.account.changePassword(ME, { current_password: PASSWORD, new_password: 'Brand-new-9' });
    expect(kit.auth.updates).toEqual([{ id: 'user-1', patch: { password: 'Brand-new-9' } }]);
  });

  it('applies the configured minimum length', async () => {
    const kit = accountKit(12);
    await expect(kit.account.changePassword(ME, { current_password: PASSWORD, new_password: 'short-123' })).rejects.toMatchObject({
      response: { code: 'password_too_short' },
    });
    expect(kit.auth.updates).toEqual([]);
  });

  it('refuses a blank, an over-long or an unchanged password', async () => {
    const kit = accountKit();
    const codeOf = (new_password: string) =>
      kit.account.changePassword(ME, { current_password: PASSWORD, new_password }).then(
        () => 'ok',
        (e: { response?: { code?: string } }) => e.response?.code,
      );
    expect(await codeOf('        ')).toBe('password_too_short');
    expect(await codeOf('x'.repeat(73))).toBe('password_too_long');
    expect(await codeOf(PASSWORD)).toBe('password_same');
  });

  it('400 wrong_password, password untouched', async () => {
    const kit = accountKit();
    await expect(kit.account.changePassword(ME, { current_password: 'wrong-pass', new_password: 'Brand-new-9' })).rejects.toMatchObject({
      response: { code: 'wrong_password' },
    });
    expect(kit.auth.updates).toEqual([]);
  });
});
