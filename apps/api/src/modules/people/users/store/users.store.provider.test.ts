import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { UserLinksRepo } from './user-links.repo';
import { UserProfilesRepo } from './user-profiles.repo';
import { UsersRepo } from './users.repo';
import { USER_STORE } from './users.store';
import { USER_STORE_PROVIDERS, userStoreOf } from './users.store.provider';

function store(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const parts = {
    directory: new UsersRepo(fake.db),
    profiles: new UserProfilesRepo(fake.db),
    links: new UserLinksRepo(fake.db),
  };
  return { ...fake, store: userStoreOf(parts) };
}

describe('userStoreOf', () => {
  it('sends the directory calls to UsersRepo', async () => {
    const { store: s, argsOf } = store({ 'rpc:user_references': [{ data: [] }] });
    expect(await s.references('u1')).toEqual([]);
    expect(argsOf('rpc:user_references', 'rpc')).toEqual([{ user_id: 'u1' }]);
  });

  it('sends the profile writes to UserProfilesRepo', async () => {
    const { store: s, argsOf } = store({ web_push_subscriptions: [{}], profiles: [{}] });
    await s.forgetBrowsers('u1');
    await s.setDisabled('u1', null);
    expect(argsOf('web_push_subscriptions', 'eq')).toEqual(['profile_id', 'u1']);
    expect(argsOf('profiles', 'update')).toEqual([
      { disabled_at: null, disabled_by: null, disabled_reason: null },
    ]);
  });

  it('sends the linking calls to UserLinksRepo', async () => {
    const { store: s } = store({ teachers: [{ data: { id: 't1' } }] });
    const row = {
      profile_id: 'u1',
      display_name_ar: 'أ. عمر',
      display_name_en: null,
      gender: 'male',
      phone_e164: null,
      tz: 'Asia/Riyadh',
    } as const;
    expect(await s.createTeacher(row)).toBe('t1');
  });
});

describe('USER_STORE_PROVIDERS', () => {
  it('keeps the USER_STORE token and builds it from the three repositories', () => {
    const factory = USER_STORE_PROVIDERS.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === USER_STORE,
    );
    expect(factory).toMatchObject({ inject: [UsersRepo, UserProfilesRepo, UserLinksRepo] });
    expect(USER_STORE_PROVIDERS).toEqual(
      expect.arrayContaining([UsersRepo, UserProfilesRepo, UserLinksRepo]),
    );
  });
});
