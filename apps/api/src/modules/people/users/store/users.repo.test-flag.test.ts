import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { UsersRepo } from './users.repo';

const row = (id: string) => ({
  id,
  email: null,
  full_name: 'سارة',
  phone_e164: null,
  role: 'guardian',
  role_id: null,
  role_key: 'guardian',
  disabled_at: null,
  last_sign_in_at: null,
  banned_until: null,
  created_at: '2026-10-06T00:00:00Z',
  linked_kind: null,
  linked_id: null,
  linked_name: null,
  linked_code: null,
  total: 2,
  username: null,
});

describe('UsersRepo.list is_test (docs/56)', () => {
  it('marks the page test logins from profiles.is_test in one read', async () => {
    const { db, argsOf } = fakeDb({
      'rpc:admin_list_users': [{ data: [row('u1'), row('u2')] }],
      profiles: [{ data: [{ id: 'u2' }] }],
    });
    const out = await new UsersRepo(db).list({ page: 1, pageSize: 10 });
    expect(out.rows.map((r) => [r.id, r.is_test])).toEqual([['u1', false], ['u2', true]]);
    expect(argsOf('profiles', 'in')).toEqual(['id', ['u1', 'u2']]);
    expect(argsOf('profiles', 'eq')).toEqual(['is_test', true]);
  });
});
