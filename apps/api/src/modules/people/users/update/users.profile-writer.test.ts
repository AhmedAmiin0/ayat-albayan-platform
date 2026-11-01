import { describe, expect, it } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { FakeAuthAdmin } from '@/modules/people/users/auth/users.fakes.auth';
import { FakeUserStore, row } from '@/modules/people/users/store/users.fakes.store';
import { UserProfileWriter } from './users.profile-writer';

const setup = () => {
  const u2 = row('u2', 'sales', { phone_e164: '+966500000002' });
  const store = new FakeUserStore([row('u1', 'sales'), u2]);
  const auth = new FakeAuthAdmin();
  auth.users.set('u1', { email: 'u1@example.com', banned: false });
  auth.users.set('u2', { email: 'u2@example.com', banned: false });
  return { store, auth, writer: new UserProfileWriter(store, auth) };
};

const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));

describe('UserProfileWriter', () => {
  it('check refuses an email or phone that another login owns, and writes nothing', async () => {
    const { auth, store, writer } = setup();
    expect(await codeOf(writer.check('u1', { email: 'u2@example.com' }))).toBe('email_taken');
    expect(await codeOf(writer.check('u1', { phone_e164: '+966500000002' }))).toBe('phone_taken');
    await writer.check('u1', { email: 'u1@example.com', phone_e164: '+966500000009' });
    expect(auth.calls).toEqual([]);
    expect(store.synced).toEqual([]);
  });

  it('write patches the profile and syncs the linked teacher name and phone', async () => {
    const { store, writer } = setup();
    const input = { full_name: 'خالد', phone_e164: '+966500000009' };
    await writer.write('u1', { patch: input, input });
    expect((await store.get('u1'))?.full_name).toBe('خالد');
    const patch = { display_name_ar: 'خالد', phone_e164: '+966500000009' };
    expect(store.synced).toEqual([{ profileId: 'u1', patch }]);
  });

  it('write without profile fields touches nothing', async () => {
    const { store, writer } = setup();
    await writer.write('u1', { patch: {}, input: { locale: 'en' } });
    expect(store.synced).toEqual([]);
  });

  it('setEmail changes the auth email only when one was sent', async () => {
    const { auth, writer } = setup();
    await writer.setEmail('u1', undefined);
    expect(auth.patches).toEqual([]);
    await writer.setEmail('u1', 'new@example.com');
    expect(auth.patches).toEqual([{ id: 'u1', patch: { email: 'new@example.com' } }]);
  });
});
