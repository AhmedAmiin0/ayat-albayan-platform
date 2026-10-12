import { describe, expect, it, vi } from 'vitest';
import { errorCode } from '../scheduling/errors';
import { ADMIN_ACTOR, row, setupUsers, type Link } from './users.fakes';
import type { Actor } from './users.service';

const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));
const people = () => [row('admin1', 'admin'), row('admin2', 'admin'), row('t1', 'teacher'), row('s1', 'student')];
const teacherLink: Link = { kind: 'teacher', id: 'tt1', name: 'أحمد', code: null, profile_id: 't1' };

describe('disable / enable', () => {
  it('marks the profile, bans the login, revokes its sessions, forgets its browsers and clears the permission cache', async () => {
    const { lifecycle, store, auth, cache } = setupUsers(people());
    const clear = vi.spyOn(cache, 'clear');
    const out = await lifecycle.disable('t1', { reason: 'لم يحضر' }, ADMIN_ACTOR);
    expect(out).toMatchObject({ status: 'disabled', disabled_reason: 'لم يحضر' });
    expect(store.rows.find((r) => r.id === 't1')?.disabled_at).not.toBeNull();
    expect(auth.users.get('t1')?.banned).toBe(true);
    expect(auth.calls).toContain('revoke:t1');
    expect(store.browsersForgotten).toEqual(['t1']);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('enable lifts the ban and clears the profile marks', async () => {
    const { lifecycle, store, auth } = setupUsers(people());
    await lifecycle.disable('t1', {}, ADMIN_ACTOR);
    const out = await lifecycle.enable('t1', ADMIN_ACTOR);
    expect(out.status).toBe('active');
    expect(store.rows.find((r) => r.id === 't1')?.disabled_at).toBeNull();
    expect(auth.users.get('t1')?.banned).toBe(false);
  });

  it('cannot disable yourself, nor the last active admin', async () => {
    const { lifecycle } = setupUsers(people());
    expect(await codeOf(lifecycle.disable('admin1', {}, ADMIN_ACTOR))).toBe('cannot_disable_self');
    await lifecycle.disable('admin2', {}, ADMIN_ACTOR);
    const other: Actor = { id: 'admin2', permissions: ADMIN_ACTOR.permissions };
    expect(await codeOf(lifecycle.disable('admin1', {}, other))).toBe('last_admin');
  });

  it('refuses disabling a user above the actor (403 permission_not_held; a system admin only by a system admin)', async () => {
    const { lifecycle } = setupUsers(people());
    const limited: Actor = { id: 'x', permissions: ['users.write'] };
    expect(await codeOf(lifecycle.disable('t1', {}, limited))).toBe('permission_not_held');
    expect(await codeOf(lifecycle.disable('admin2', {}, limited))).toBe('system_admin_only');
  });

  it('disables a student login without touching the admins check', async () => {
    const { lifecycle } = setupUsers(people());
    expect((await lifecycle.disable('s1', {}, ADMIN_ACTOR)).status).toBe('disabled');
  });

  it('nobody enables themselves (409 self_lockout)', async () => {
    const { lifecycle, auth } = setupUsers(people());
    expect(await codeOf(lifecycle.enable('admin1', ADMIN_ACTOR))).toBe('self_lockout');
    expect(auth.calls).toEqual([]);
  });

  it('answers 409 last_admin and bans nobody when the database guard wins a race the API check lost', async () => {
    const { lifecycle, store, auth, cache } = setupUsers(people());
    const clear = vi.spyOn(cache, 'clear');
    store.guardLost = true;
    expect(await codeOf(lifecycle.disable('t1', {}, ADMIN_ACTOR))).toBe('last_admin');
    expect(store.rows.find((r) => r.id === 't1')?.disabled_at).toBeNull();
    expect(auth.calls).toEqual([]);
    expect(clear).not.toHaveBeenCalled();
  });
});

describe('reset-password / sign-out', () => {
  it('sets a typed password, or generates one shown once; neither reaches the audit trail', async () => {
    const { lifecycle, auth, audit } = setupUsers(people());
    const typed = await lifecycle.resetPassword('t1', { credential: 'set', password: 'new-pass-123' }, ADMIN_ACTOR);
    expect(typed.credential).toBeNull();
    expect(auth.users.get('t1')?.password).toBe('new-pass-123');
    const made = await lifecycle.resetPassword('t1', { credential: 'generate' }, ADMIN_ACTOR);
    expect(made.credential?.value).toBe(auth.users.get('t1')?.password);
    expect(auth.calls.filter((c) => c === 'revoke:t1')).toHaveLength(2);
    const logged = JSON.stringify(audit.record.mock.calls);
    expect(logged).not.toContain('new-pass-123');
    expect(logged).not.toContain(made.credential?.value ?? 'x');
  });

  it('returns a recovery link without setting a password, and refuses a short typed one', async () => {
    const { lifecycle, auth } = setupUsers(people());
    const out = await lifecycle.resetPassword('t1', { credential: 'link' }, ADMIN_ACTOR);
    expect(out.credential?.kind).toBe('link');
    expect(auth.users.get('t1')?.password).toBeUndefined();
    expect(await codeOf(lifecycle.resetPassword('t1', { credential: 'set', password: 'abc' }, ADMIN_ACTOR))).toBe('password_too_short');
  });

  it('signs a user out everywhere', async () => {
    const { lifecycle, auth } = setupUsers(people());
    await lifecycle.signOut('t1', ADMIN_ACTOR);
    expect(auth.calls).toEqual(['revoke:t1']);
  });
});

describe('DELETE /users/:id', () => {
  it('deletes the login and nothing else: the foreign keys release the linked record (no unlink step)', async () => {
    const { lifecycle, store, auth, cache } = setupUsers(people(), [teacherLink]);
    const clear = vi.spyOn(cache, 'clear');
    store.refs['t1'] = [{ ref_table: 'teachers', ref_column: 'profile_id', kind: 'link', n: 1 }];
    await lifecycle.remove('t1', ADMIN_ACTOR);
    expect(auth.calls).toEqual(['remove:t1']);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('refuses with 409 users_has_history, the table counts and a disable hint', async () => {
    const { lifecycle, store, auth } = setupUsers(people());
    store.refs['t1'] = [{ ref_table: 'lessons', ref_column: 'created_by', kind: 'history', n: 4 }];
    const e = await lifecycle.remove('t1', ADMIN_ACTOR).catch((x: unknown) => x);
    expect(errorCode(e)).toBe('users_has_history');
    expect((e as { getResponse(): unknown }).getResponse()).toMatchObject({ references: [{ table: 'lessons', column: 'created_by', count: 4 }], hint: 'disable_instead' });
    expect(auth.calls).toEqual([]);
  });

  it('cannot delete yourself or the last active admin', async () => {
    const { lifecycle } = setupUsers([row('admin1', 'admin'), row('admin2', 'admin', { disabled_at: 'now' })]);
    expect(await codeOf(lifecycle.remove('admin1', ADMIN_ACTOR))).toBe('cannot_delete_self');
    const other: Actor = { id: 'admin2', permissions: ADMIN_ACTOR.permissions };
    expect(await codeOf(lifecycle.remove('admin1', other))).toBe('last_admin');
  });

  it('answers 404 for a user that does not exist', async () => {
    const { lifecycle } = setupUsers(people());
    expect(await codeOf(lifecycle.remove('ghost', ADMIN_ACTOR))).toBe('user_not_found');
  });
});
