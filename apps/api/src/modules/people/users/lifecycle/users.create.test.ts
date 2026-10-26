import type { UserCreate } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { errorCode } from '../../../../common/http/errors';
import { ADMIN_ACTOR, row, setupUsers, type Link } from '../users.fakes';
import type { Actor } from '../users.service';

const base: UserCreate = { email: 'new@example.com', full_name: 'علي أحمد', role: 'sales', credential: 'generate' };
const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));
const student = (): Link => ({ kind: 'student', id: 's1', name: 'سارة', code: 'AB-0183', profile_id: null });

describe('POST /users', () => {
  it('creates a staff login with a generated password shown once and never audited', async () => {
    const { creator, store, auth, audit } = setupUsers();
    const out = await creator.create(base, ADMIN_ACTOR);
    expect(out.credential?.kind).toBe('password');
    const password = out.credential?.value ?? '';
    expect(password.length).toBeGreaterThanOrEqual(16);
    expect(auth.users.get('auth-1')).toMatchObject({ email: 'new@example.com', password });
    expect(store.rows.find((r) => r.id === 'auth-1')).toMatchObject({ role: 'sales', role_id: null, full_name: 'علي أحمد' });
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain(password);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'users', action: 'create', actorId: 'admin1' }));
  });

  it('uses a typed password only when long enough', async () => {
    const { creator, auth } = setupUsers();
    expect(await codeOf(creator.create({ ...base, credential: 'set', password: 'short' }, ADMIN_ACTOR))).toBe('password_too_short');
    expect(auth.users.size).toBe(0);
    const ok = await creator.create({ ...base, credential: 'set', password: 'long-enough-1' }, ADMIN_ACTOR);
    expect(ok.credential).toBeNull();
    expect(auth.users.get('auth-1')?.password).toBe('long-enough-1');
  });

  it('invite mode creates the login without a password and returns the recovery link', async () => {
    const { creator, auth } = setupUsers();
    const out = await creator.create({ ...base, credential: 'link' }, ADMIN_ACTOR);
    expect(auth.users.get('auth-1')?.password).toBeUndefined();
    expect(out.credential).toMatchObject({ kind: 'link' });
    expect(out.credential?.value).toContain('https://auth.example.test');
  });

  it('is idempotent on email: a login without a profile is adopted, one with a profile is 409 email_taken', async () => {
    const { creator, auth, store } = setupUsers();
    auth.users.set('orphan', { email: 'new@example.com', banned: false });
    const out = await creator.create(base, ADMIN_ACTOR);
    expect(out.user.id).toBe('orphan');
    expect(auth.calls).not.toContain('create:auth-1');
    expect(store.rows.some((r) => r.id === 'orphan')).toBe(true);
    expect(await codeOf(creator.create(base, ADMIN_ACTOR))).toBe('email_taken');
  });

  it('refreshes an adopted login: confirmed email, name, a random password in link mode, sessions revoked', async () => {
    const { creator, auth } = setupUsers();
    auth.users.set('orphan', { email: 'new@example.com', password: 'left-by-a-failed-attempt', banned: false });
    const out = await creator.create({ ...base, credential: 'link' }, ADMIN_ACTOR);
    const password = auth.users.get('orphan')?.password ?? '';
    expect(out.credential?.kind).toBe('link');
    expect(password).not.toBe('left-by-a-failed-attempt');
    expect(password.length).toBeGreaterThanOrEqual(16);
    expect(out.credential?.value).not.toContain(password);
    expect(auth.patches[0]).toMatchObject({ id: 'orphan', patch: { confirmEmail: true, fullName: 'علي أحمد' } });
    expect(auth.calls).toContain('revoke:orphan');
  });

  it('links an existing student to the new login and refuses one that already has a login (409 link_taken)', async () => {
    const { creator, store } = setupUsers([row('admin1', 'admin')], [student()]);
    const out = await creator.create({ ...base, role: 'student', linked_id: 's1' }, ADMIN_ACTOR);
    expect(out.user.linked).toMatchObject({ kind: 'student', code: 'AB-0183' });
    expect(store.links[0]?.profile_id).toBe('auth-1');
    expect(await codeOf(creator.create({ ...base, email: 'two@example.com', role: 'student', linked_id: 's1' }, ADMIN_ACTOR))).toBe('link_taken');
  });

  it('refuses a missing link target and removes the new login when the link is lost to a race', async () => {
    const { creator, store, auth } = setupUsers([row('admin1', 'admin')], [{ ...student(), id: 'g1', kind: 'guardian', code: null }]);
    expect(await codeOf(creator.create({ ...base, role: 'student', linked_id: 'nope' }, ADMIN_ACTOR))).toBe('link_target_not_found');
    store.failLink = true;
    expect(await codeOf(creator.create({ ...base, role: 'guardian', linked_id: 'g1' }, ADMIN_ACTOR))).toBe('link_taken');
    expect(auth.calls).toContain('remove:auth-1');
    expect(auth.users.size).toBe(0);
  });

  it('creates a teachers row for a new teacher with the profile phone and zone', async () => {
    const { creator, store } = setupUsers();
    await creator.create({ ...base, role: 'teacher', phone_e164: '+966501234567', tz: 'Africa/Cairo', new_teacher: { display_name_ar: 'أحمد', gender: 'male' } }, ADMIN_ACTOR);
    expect(store.teachers[0]).toMatchObject({ display_name_ar: 'أحمد', phone_e164: '+966501234567', tz: 'Africa/Cairo', profile_id: 'auth-1' });
  });

  it('refuses a role beyond what the actor holds (403 permission_not_held)', async () => {
    const { creator, auth } = setupUsers();
    const limited: Actor = { id: 'admin1', permissions: ['users.write'] };
    expect(await codeOf(creator.create({ ...base, role: 'admin' }, limited))).toBe('permission_not_held');
    expect(auth.users.size).toBe(0);
  });

  it('refuses an unknown or mismatched role', async () => {
    const { creator } = setupUsers();
    expect(await codeOf(creator.create({ ...base, role_id: 'nope' }, ADMIN_ACTOR))).toBe('unknown_role');
    expect(await codeOf(creator.create({ ...base, role_id: 'sys-teacher' }, ADMIN_ACTOR))).toBe('role_mismatch');
  });
});
