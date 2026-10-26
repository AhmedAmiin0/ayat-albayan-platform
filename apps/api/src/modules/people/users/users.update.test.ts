import { describe, expect, it, vi } from 'vitest';
import { errorCode } from '../../../common/http/errors';
import { ADMIN_ACTOR, row, setupUsers, type Link } from './users.fakes';
import type { Actor } from './users.service';

const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));
const admins = () => [row('admin1', 'admin'), row('admin2', 'admin'), row('sales1', 'sales'), row('t1', 'teacher')];
const teacherLink: Link = { kind: 'teacher', id: 'tt1', name: 'أحمد', code: null, profile_id: 't1' };

describe('PATCH /users/:id', () => {
  it('updates name, phone, locale and zone and writes an audit row', async () => {
    const { users, store, audit } = setupUsers(admins());
    const out = await users.update('sales1', { full_name: 'خالد', phone_e164: '+966501234567', locale: 'en', tz: 'Asia/Dubai' }, ADMIN_ACTOR);
    expect(out).toMatchObject({ full_name: 'خالد', phone_e164: '+966501234567' });
    expect(store.rows.find((r) => r.id === 'sales1')).toMatchObject({ locale: 'en', tz: 'Asia/Dubai' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', entityId: 'sales1' }));
  });

  it('changes the email through the Auth Admin API, refusing one that belongs to another login', async () => {
    const { users, auth } = setupUsers(admins());
    auth.users.set('sales1', { email: 'sales1@example.com', banned: false });
    auth.users.set('other', { email: 'taken@example.com', banned: false });
    expect(await codeOf(users.update('sales1', { email: 'taken@example.com' }, ADMIN_ACTOR))).toBe('email_taken');
    await users.update('sales1', { email: 'fresh@example.com' }, ADMIN_ACTOR);
    expect(auth.users.get('sales1')?.email).toBe('fresh@example.com');
  });

  it('keeps a linked teacher\'s display name and phone in step with the profile', async () => {
    const { users, store } = setupUsers(admins(), [teacherLink]);
    await users.update('t1', { full_name: 'أحمد علي', phone_e164: '+201001234567' }, ADMIN_ACTOR);
    expect(store.synced).toEqual([{ profileId: 't1', patch: { display_name_ar: 'أحمد علي', phone_e164: '+201001234567' } }]);
  });

  it('moves a user between staff roles and clears the permission cache', async () => {
    const { users, store, cache } = setupUsers(admins());
    const clear = vi.spyOn(cache, 'clear');
    await users.update('sales1', { role: 'assistant' }, ADMIN_ACTOR);
    expect(store.rows.find((r) => r.id === 'sales1')?.role).toBe('assistant');
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('refuses a base role change for a linked user, or into a record-backed role (409 role_change_linked)', async () => {
    const { users } = setupUsers(admins(), [teacherLink]);
    expect(await codeOf(users.update('t1', { role: 'sales' }, ADMIN_ACTOR))).toBe('role_change_linked');
    expect(await codeOf(users.update('sales1', { role: 'teacher' }, ADMIN_ACTOR))).toBe('role_change_linked');
  });

  it('refuses editing a user whose permissions exceed the actor\'s (403 permission_not_held)', async () => {
    const { users } = setupUsers(admins());
    const limited: Actor = { id: 'admin1', permissions: ['users.write', 'classroom.join'] };
    expect(await codeOf(users.update('admin2', { full_name: 'محاولة' }, limited))).toBe('permission_not_held');
    expect(await codeOf(users.update('sales1', { role: 'assistant' }, limited))).toBe('permission_not_held');
  });

  it('never demotes the last active admin, nor lets the actor lock themselves out', async () => {
    const { users } = setupUsers([row('admin1', 'admin'), row('sales1', 'sales')]);
    expect(await codeOf(users.update('admin1', { role: 'sales' }, ADMIN_ACTOR))).toBe('last_admin');
    const two = setupUsers([row('admin1', 'admin'), row('admin2', 'admin')]);
    expect(await codeOf(two.users.update('admin1', { role: 'assistant' }, ADMIN_ACTOR))).toBe('self_lockout');
  });

  it('is all or nothing: a taken phone changes neither the email, the name nor the teacher record (409 phone_taken)', async () => {
    const { users, store, auth } = setupUsers(admins(), [teacherLink]);
    store.rows = store.rows.map((r) => (r.id === 'sales1' ? { ...r, phone_e164: '+966501234567' } : r));
    auth.users.set('t1', { email: 't1@example.com', banned: false });
    const wanted = { email: 'fresh@example.com', full_name: 'اسم جديد', phone_e164: '+966501234567' };
    expect(await codeOf(users.update('t1', wanted, ADMIN_ACTOR))).toBe('phone_taken');
    expect(store.rows.find((r) => r.id === 't1')).toMatchObject({ full_name: 'User t1', phone_e164: null });
    expect(store.synced).toEqual([]);
    expect(auth.users.get('t1')?.email).toBe('t1@example.com');
    expect(auth.calls).toEqual([]);
  });

  it('also refuses a phone held by another teacher record, before writing anything', async () => {
    const { users, store, auth } = setupUsers(admins(), [teacherLink]);
    store.otherTeacherPhones = ['+201001234567'];
    expect(await codeOf(users.update('t1', { full_name: 'اسم جديد', phone_e164: '+201001234567' }, ADMIN_ACTOR))).toBe('phone_taken');
    expect(store.rows.find((r) => r.id === 't1')?.full_name).toBe('User t1');
    expect(store.synced).toEqual([]);
    expect(auth.calls).toEqual([]);
  });

  it('changes the auth email last: a refused profile write leaves the email alone', async () => {
    const { users, store, auth, cache } = setupUsers(admins());
    const clear = vi.spyOn(cache, 'clear');
    store.guardLost = true;
    expect(await codeOf(users.update('sales1', { role: 'assistant', email: 'fresh@example.com' }, ADMIN_ACTOR))).toBe('last_admin');
    expect(auth.calls).toEqual([]);
    expect(clear).not.toHaveBeenCalled();
    store.guardLost = false;
    await users.update('sales1', { role: 'assistant', email: 'fresh@example.com' }, ADMIN_ACTOR);
    expect(auth.patches).toEqual([{ id: 'sales1', patch: { email: 'fresh@example.com' } }]);
  });

  it('answers 404 for an unknown user and 400 for an unknown role', async () => {
    const { users } = setupUsers(admins());
    expect(await codeOf(users.update('ghost', { full_name: 'x y' }, ADMIN_ACTOR))).toBe('user_not_found');
    expect(await codeOf(users.update('sales1', { role_id: 'nope' }, ADMIN_ACTOR))).toBe('unknown_role');
  });

  it('role_id null returns the user to the system role of the base role', async () => {
    const { users, store } = setupUsers([...admins()]);
    store.rows = store.rows.map((r) => (r.id === 'sales1' ? { ...r, role_id: 'custom-sales' } : r));
    await users.update('sales1', { role_id: null }, ADMIN_ACTOR);
    expect(store.rows.find((r) => r.id === 'sales1')?.role_id).toBeNull();
  });
});
