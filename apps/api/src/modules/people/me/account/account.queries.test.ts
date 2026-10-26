import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../guardians/fake-db';
import { AccountQueries } from './account.queries';

describe('AccountQueries', () => {
  it('update writes the whitelisted columns of the caller’s row only', async () => {
    const { db, argsOf } = fakeDb({ profiles: [{}] });
    const patch = { full_name: 'Huda', role: 'admin', disabled_at: null };
    await new AccountQueries(db).update('user-1', patch);
    expect(argsOf('profiles', 'update')).toEqual([{ full_name: 'Huda' }]);
    expect(argsOf('profiles', 'eq')).toEqual(['id', 'user-1']);
  });

  it('maps a unique violation to 409 phone_taken', async () => {
    const { db } = fakeDb({ profiles: [{ error: { code: '23505', message: 'dup' } }] });
    await expect(new AccountQueries(db).update('user-1', { phone_e164: '+966501234567' })).rejects.toMatchObject({
      response: { code: 'phone_taken' },
    });
  });

  it('reads the profile with the held custom role’s names', async () => {
    const profile = { id: 'user-1', full_name: 'Huda', phone_e164: null, avatar_path: null, role: 'sales', role_id: 'r-9' };
    const { db, argsOf } = fakeDb({ profiles: [{ data: profile }], roles: [{ data: [{ key: 'closer', name_ar: 'n', name_en: 'Closer' }] }] });
    const row = await new AccountQueries(db).get('user-1');
    expect(row?.role).toEqual({ base: 'sales', key: 'closer', name_ar: 'n', name_en: 'Closer' });
    expect(argsOf('roles', 'eq')).toEqual(['id', 'r-9']);
  });
});
