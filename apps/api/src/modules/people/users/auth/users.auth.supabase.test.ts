import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import { SupabaseAuthAdmin } from './users.auth.supabase';

const config = { passwordMinLength: 8, setPasswordUrl: 'https://app.example.test/set-password' };

function admin(overrides: Record<string, unknown> = {}) {
  const api = {
    createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    updateUserById: vi.fn().mockResolvedValue({ error: null }),
    deleteUser: vi.fn().mockResolvedValue({ error: null }),
    generateLink: vi.fn().mockResolvedValue({ data: { properties: { action_link: 'https://link.example.test/x' } }, error: null }),
    ...overrides,
  };
  const rpc = vi.fn().mockResolvedValue({ data: 'u9', error: null });
  const db = { auth: { admin: api }, rpc } as unknown as Db;
  return { svc: new SupabaseAuthAdmin(db, config), api, rpc };
}

describe('SupabaseAuthAdmin', () => {
  it('creates a confirmed login, with a password only when given', async () => {
    const { svc, api } = admin();
    expect(await svc.create({ email: 'a@example.com', fullName: 'علي' })).toBe('u1');
    expect(api.createUser).toHaveBeenCalledWith({ email: 'a@example.com', email_confirm: true, user_metadata: { full_name: 'علي' } });
    await svc.create({ email: 'b@example.com', password: 'secret-123', fullName: 'علي' });
    expect(api.createUser).toHaveBeenLastCalledWith(expect.objectContaining({ password: 'secret-123' }));
  });

  it('maps a taken email to 409 and a weak password to 400', async () => {
    const taken = admin({ createUser: vi.fn().mockResolvedValue({ data: null, error: { code: 'email_exists', message: 'x' } }) });
    await expect(taken.svc.create({ email: 'a@example.com', fullName: 'علي' })).rejects.toMatchObject({ response: { code: 'email_taken' } });
    const weak = admin({ updateUserById: vi.fn().mockResolvedValue({ error: { code: 'weak_password', message: 'x' } }) });
    await expect(weak.svc.update('u1', { password: 'abc' })).rejects.toMatchObject({ response: { code: 'password_too_short' } });
  });

  it('bans for good, lifts the ban and changes the email without confirmation mail', async () => {
    const { svc, api } = admin();
    await svc.update('u1', { banned: true });
    expect(api.updateUserById).toHaveBeenLastCalledWith('u1', { ban_duration: '876000h' });
    await svc.update('u1', { banned: false });
    expect(api.updateUserById).toHaveBeenLastCalledWith('u1', { ban_duration: 'none' });
    await svc.update('u1', { email: 'new@example.com' });
    expect(api.updateUserById).toHaveBeenLastCalledWith('u1', { email: 'new@example.com', email_confirm: true });
  });

  it('refreshes an adopted login: confirmed email, name in the metadata, new password', async () => {
    const { svc, api } = admin();
    await svc.update('u1', { confirmEmail: true, fullName: 'علي', password: 'long-enough-1' });
    expect(api.updateUserById).toHaveBeenLastCalledWith('u1', { email_confirm: true, user_metadata: { full_name: 'علي' }, password: 'long-enough-1' });
  });

  it('builds the recovery link to the web set-password page and never leaks an error body', async () => {
    const { svc, api } = admin();
    expect(await svc.recoveryLink('a@example.com')).toBe('https://link.example.test/x');
    expect(api.generateLink).toHaveBeenCalledWith({ type: 'recovery', email: 'a@example.com', options: { redirectTo: config.setPasswordUrl } });
    const failing = admin({ deleteUser: vi.fn().mockResolvedValue({ error: { code: 'unexpected', message: 'token=SECRET' } }) });
    await expect(failing.svc.remove('u1')).rejects.toThrow('auth admin: unexpected');
  });

  it('looks logins up by email and revokes sessions through the service-role functions', async () => {
    const { svc, rpc } = admin();
    expect(await svc.findIdByEmail('a@example.com')).toBe('u9');
    await svc.revokeSessions('u1');
    expect(rpc).toHaveBeenCalledWith('auth_user_id_by_email', { p_email: 'a@example.com' });
    expect(rpc).toHaveBeenLastCalledWith('revoke_user_sessions', { p_user: 'u1' });
  });
});
