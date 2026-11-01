import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { mapListRow } from './users.rows';
import { UsersRepo } from './users.repo';

const listRow = {
  id: 'u1', email: 'a@example.com', full_name: 'سارة', phone_e164: null, role: 'student', role_id: null, role_key: 'student',
  disabled_at: null, last_sign_in_at: null, banned_until: null, created_at: '2026-10-06T00:00:00Z',
  linked_kind: 'student', linked_id: 's1', linked_name: 'سارة', linked_code: 'AB-0183', total: 7, username: null,
} as const;

describe('UsersQueries', () => {
  it('lists through admin_list_users with the page as limit / offset and the total of the first row', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:admin_list_users': [{ data: [listRow] }] });
    const out = await new UsersRepo(db).list({ page: 3, pageSize: 10, q: 'AB-0183', role: 'student', status: 'active' });
    expect(argsOf('rpc:admin_list_users', 'rpc')).toEqual([{ q: 'AB-0183', role: 'student', status: 'active', lim: 10, off: 20 }]);
    expect(out.total).toBe(7);
    expect(out.rows[0]?.linked).toEqual({ kind: 'student', id: 's1', name: 'سارة', code: 'AB-0183' });
  });

  it('omits unset filters and reports a total of 0 for an empty page', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:admin_list_users': [{ data: [] }] });
    const out = await new UsersRepo(db).list({ page: 1, pageSize: 25 });
    expect(argsOf('rpc:admin_list_users', 'rpc')).toEqual([{ lim: 25, off: 0 }]);
    expect(out).toEqual({ rows: [], total: 0 });
  });

  it('reports the real total for a page beyond the last (one more call for the first row of page 1)', async () => {
    const { db, calls } = fakeDb({ 'rpc:admin_list_users': [{ data: [] }, { data: [listRow] }] });
    const out = await new UsersRepo(db).list({ page: 9, pageSize: 10, status: 'active' });
    expect(out).toEqual({ rows: [], total: 7 });
    expect(calls.filter((c) => c.method === 'rpc').map((c) => c.args[0])).toEqual([{ status: 'active', lim: 10, off: 80 }, { status: 'active', lim: 1, off: 0 }]);
  });

  it('maps user_references rows and tells links from history', async () => {
    const { db } = fakeDb({ 'rpc:user_references': [{ data: [
      { ref_table: 'teachers', ref_column: 'profile_id', kind: 'link', n: 1 },
      { ref_table: 'payments', ref_column: 'recorded_by', kind: 'history', n: 3 },
    ] }] });
    expect(await new UsersRepo(db).references('u1')).toEqual([
      { ref_table: 'teachers', ref_column: 'profile_id', kind: 'link', n: 1 },
      { ref_table: 'payments', ref_column: 'recorded_by', kind: 'history', n: 3 },
    ]);
  });

  it('turns a duplicate phone into 409 phone_taken and other errors into 500s', async () => {
    const dup = fakeDb({ profiles: [{ error: { code: '23505', message: 'dup' } }] });
    await expect(new UsersRepo(dup.db).updateProfile('u1', { phone_e164: '+966501234567' })).rejects.toMatchObject({ response: { code: 'phone_taken' } });
    const bad = fakeDb({ profiles: [{ error: { code: 'XX000', message: 'boom' } }] });
    await expect(new UsersRepo(bad.db).updateProfile('u1', { tz: 'Asia/Dubai' })).rejects.toThrow(/boom/);
  });

  it('turns the database last-admin guard (P0001 last_admin) into 409 on a role change and on disable', async () => {
    const raised = { error: { code: 'P0001', message: 'last_admin' } };
    const role = fakeDb({ profiles: [raised] });
    await expect(new UsersRepo(role.db).updateProfile('u1', { role: 'sales', role_id: null })).rejects.toMatchObject({ response: { code: 'last_admin' } });
    const off = fakeDb({ profiles: [raised] });
    await expect(new UsersRepo(off.db).setDisabled('u1', { by: 'a1', reason: null })).rejects.toMatchObject({ response: { code: 'last_admin' } });
    const other = fakeDb({ profiles: [{ error: { code: 'P0001', message: 'something_else' } }] });
    await expect(new UsersRepo(other.db).setDisabled('u1', null)).rejects.toThrow(/something_else/);
  });

  it('stamps disabled_at / by / reason, and clears them on enable', async () => {
    const on = fakeDb({ profiles: [{}] });
    await new UsersRepo(on.db).setDisabled('u1', { by: 'a1', reason: 'سبب' });
    expect(on.argsOf('profiles', 'update')?.[0]).toMatchObject({ disabled_by: 'a1', disabled_reason: 'سبب', disabled_at: expect.any(String) });
    const off = fakeDb({ profiles: [{}] });
    await new UsersRepo(off.db).setDisabled('u1', null);
    expect(off.argsOf('profiles', 'update')?.[0]).toEqual({ disabled_at: null, disabled_by: null, disabled_reason: null });
  });

  it('forgetBrowsers deletes only that profile’s web push subscriptions', async () => {
    const { db, argsOf } = fakeDb({ web_push_subscriptions: [{}] });
    await new UsersRepo(db).forgetBrowsers('u1');
    expect(argsOf('web_push_subscriptions', 'eq')).toEqual(['profile_id', 'u1']);
  });
});

describe('mapListRow', () => {
  it('has no linked record when the login belongs to none', () => {
    expect(mapListRow({ ...listRow, linked_kind: null, linked_id: null, linked_name: null, linked_code: null }).linked).toBeNull();
  });
});
