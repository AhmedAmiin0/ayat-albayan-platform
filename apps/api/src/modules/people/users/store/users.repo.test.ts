import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { mapListRow } from './users.rows';
import { UsersRepo } from './users.repo';

const listRow = {
  id: 'u1', email: 'a@example.com', full_name: 'سارة', phone_e164: null, role: 'student', role_id: null, role_key: 'student',
  disabled_at: null, last_sign_in_at: null, banned_until: null, created_at: '2026-10-06T00:00:00Z',
  linked_kind: 'student', linked_id: 's1', linked_name: 'سارة', linked_code: 'AB-0183', total: 7, username: null,
} as const;

describe('UsersRepo', () => {
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
});

describe('mapListRow', () => {
  it('has no linked record when the login belongs to none', () => {
    expect(mapListRow({ ...listRow, linked_kind: null, linked_id: null, linked_name: null, linked_code: null }).linked).toBeNull();
  });
});
