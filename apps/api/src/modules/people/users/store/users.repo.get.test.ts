import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { mapListRow } from './users.rows';
import { UsersRepo } from './users.repo';

// Family accounts (docs/30 §2): a family login's synthetic email is never shown; the username is.

const PROFILE = {
  id: 'u1', full_name: 'أ. عمر', role: 'teacher', role_id: null, disabled_at: null, disabled_reason: null,
  phone_e164: null, locale: 'ar', tz: 'Africa/Cairo', created_at: '2026-10-06T00:00:00Z', username: 'ustadh.omar',
};

/** fakeDb plus the auth admin user `email` (supabase-js auth.admin.getUserById). */
function withAuth(email: string) {
  const fake = fakeDb({ profiles: [{ data: PROFILE }], roles: [{ data: { key: 'teacher' } }] });
  const user = { email, last_sign_in_at: null };
  const auth = { admin: { getUserById: async () => ({ data: { user }, error: null }) } };
  return Object.assign(fake.db, { auth }) as unknown as Db;
}

describe('UsersQueries.get — email and username', () => {
  it('hides a synthetic family email and returns the username', async () => {
    const out = await new UsersRepo(withAuth('g-1@family.invalid')).get('u1');
    expect(out).toMatchObject({ email: null, username: 'ustadh.omar' });
  });

  it('keeps a real email', async () => {
    expect(await new UsersRepo(withAuth('omar@example.com')).get('u1')).toMatchObject({ email: 'omar@example.com' });
  });
});

describe('mapListRow — username', () => {
  it('carries the username of the row', () => {
    const row = {
      id: 'u1', email: 'a@example.com', full_name: 'أ. عمر', phone_e164: null, role: 'teacher', role_id: null,
      role_key: 'teacher', disabled_at: null, last_sign_in_at: null, banned_until: null, created_at: '2026-10-06T00:00:00Z',
      linked_kind: null, linked_id: null, linked_name: null, linked_code: null, total: 1, username: 'ustadh.omar',
    } as const;
    expect(mapListRow(row).username).toBe('ustadh.omar');
  });
});
