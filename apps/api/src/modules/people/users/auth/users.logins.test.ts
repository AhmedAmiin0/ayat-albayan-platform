import { describe, expect, it } from 'vitest';
import { FakeAuthAdmin } from './users.fakes.auth';
import { UserLogins } from './users.logins';

const config = { passwordMinLength: 10, setPasswordUrl: 'https://app.example.test/set-password' };
const setup = () => {
  const auth = new FakeAuthAdmin();
  return { auth, logins: new UserLogins(auth, config) };
};

describe('UserLogins', () => {
  it('passes the Auth Admin calls through', async () => {
    const { auth, logins } = setup();
    const id = await logins.create({ email: 'a@example.test', fullName: 'أ' });
    expect(await logins.findIdByEmail('a@example.test')).toBe(id);
    await logins.update(id, { banned: true });
    await logins.revokeSessions(id);
    await logins.remove(id);
    expect(auth.calls).toEqual([`create:${id}`, `update:${id}`, `revoke:${id}`, `remove:${id}`]);
  });

  it('prepares a credential under the configured minimum length', () => {
    const { logins } = setup();
    expect(() => logins.prepare({ mode: 'password', password: 'short' })).toThrow();
    const generated = logins.prepare({ mode: 'generate' });
    expect(generated.password?.length).toBeGreaterThanOrEqual(10);
    expect(logins.prepare({ mode: 'link' })).toEqual({ password: undefined, issued: null });
  });

  it('fresh() is a random password of the minimum length', () => {
    const { logins } = setup();
    expect(logins.fresh().length).toBeGreaterThanOrEqual(10);
    expect(logins.fresh()).not.toBe(logins.fresh());
  });

  it('issue() returns the recovery link in link mode, else what was prepared', async () => {
    const { logins } = setup();
    const link = await logins.issue({
      email: 'a@example.test',
      prepared: { password: undefined, issued: null },
      mode: 'link',
    });
    expect(link?.kind).toBe('link');
    const issued = { kind: 'password' as const, value: 'p' };
    const kept = await logins.issue({
      email: 'a@example.test',
      prepared: { password: 'p', issued },
      mode: 'generate',
    });
    expect(kept).toBe(issued);
  });
});
