import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { UserProfilesRepo } from './user-profiles.repo';

describe('UserProfilesRepo', () => {
  it('reads the staff rows (no guardians / students) and one profile', async () => {
    const staffRow = {
      id: 'u1',
      full_name: 'سارة',
      role: 'sales',
      role_id: null,
      disabled_at: null,
    };
    const { db, argsOf } = fakeDb({ profiles: [{ data: [staffRow] }, { data: staffRow }] });
    const repo = new UserProfilesRepo(db);
    expect(await repo.staff()).toEqual([staffRow]);
    expect(argsOf('profiles', 'in')).toEqual(['role', ['admin', 'teacher', 'assistant', 'sales']]);
    expect(await repo.profile('u1')).toEqual(staffRow);
  });

  it('upserts on id and turns a duplicate phone into 409 phone_taken', async () => {
    const ok = fakeDb({ profiles: [{}] });
    const row = {
      id: 'u1',
      role: 'sales',
      role_id: null,
      full_name: 'سارة',
      phone_e164: null,
      locale: 'ar',
      tz: 'Asia/Riyadh',
    } as const;
    await new UserProfilesRepo(ok.db).upsertProfile(row);
    expect(ok.argsOf('profiles', 'upsert')).toEqual([row, { onConflict: 'id' }]);
    const dup = fakeDb({ profiles: [{ error: { code: '23505', message: 'dup' } }] });
    await expect(new UserProfilesRepo(dup.db).upsertProfile(row)).rejects.toMatchObject({
      response: { code: 'phone_taken' },
    });
  });

  it('turns a duplicate phone into 409 phone_taken and other errors into 500s', async () => {
    const dup = fakeDb({ profiles: [{ error: { code: '23505', message: 'dup' } }] });
    await expect(
      new UserProfilesRepo(dup.db).updateProfile('u1', { phone_e164: '+966501234567' }),
    ).rejects.toMatchObject({ response: { code: 'phone_taken' } });
    const bad = fakeDb({ profiles: [{ error: { code: 'XX000', message: 'boom' } }] });
    await expect(
      new UserProfilesRepo(bad.db).updateProfile('u1', { tz: 'Asia/Dubai' }),
    ).rejects.toThrow(/boom/);
  });

  it('turns the database last-admin guard (P0001 last_admin) into 409 on a role change and on disable', async () => {
    const raised = { error: { code: 'P0001', message: 'last_admin' } };
    const role = fakeDb({ profiles: [raised] });
    await expect(
      new UserProfilesRepo(role.db).updateProfile('u1', { role: 'sales', role_id: null }),
    ).rejects.toMatchObject({ response: { code: 'last_admin' } });
    const off = fakeDb({ profiles: [raised] });
    await expect(
      new UserProfilesRepo(off.db).setDisabled('u1', { by: 'a1', reason: null }),
    ).rejects.toMatchObject({ response: { code: 'last_admin' } });
    const other = fakeDb({ profiles: [{ error: { code: 'P0001', message: 'something_else' } }] });
    await expect(new UserProfilesRepo(other.db).setDisabled('u1', null)).rejects.toThrow(
      /something_else/,
    );
  });

  it('stamps disabled_at / by / reason, and clears them on enable', async () => {
    const on = fakeDb({ profiles: [{}] });
    await new UserProfilesRepo(on.db).setDisabled('u1', { by: 'a1', reason: 'سبب' });
    expect(on.argsOf('profiles', 'update')?.[0]).toMatchObject({
      disabled_by: 'a1',
      disabled_reason: 'سبب',
      disabled_at: expect.any(String),
    });
    const off = fakeDb({ profiles: [{}] });
    await new UserProfilesRepo(off.db).setDisabled('u1', null);
    expect(off.argsOf('profiles', 'update')?.[0]).toEqual({
      disabled_at: null,
      disabled_by: null,
      disabled_reason: null,
    });
  });

  it('forgetBrowsers deletes only that profile’s web push subscriptions', async () => {
    const { db, argsOf } = fakeDb({ web_push_subscriptions: [{}] });
    await new UserProfilesRepo(db).forgetBrowsers('u1');
    expect(argsOf('web_push_subscriptions', 'eq')).toEqual(['profile_id', 'u1']);
  });
});
