import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { accountCalls } from './account-api';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const profile = {
  id: ID,
  full_name: 'Teacher One',
  email: 'one@example.com',
  phone_e164: null,
  avatar_url: null,
  avatar_seed: ID,
  role: { base: 'teacher', key: 'teacher', name_ar: null, name_en: 'Teacher' },
};
const upload = {
  bucket: 'avatars',
  path: `${ID}/a.webp`,
  token: 't',
  signed_url: 'https://s.test',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('account calls (R-ACC-01..05)', () => {
  it('reads GET /me/profile', async () => {
    const { client, apiFetch } = clientAnswering(profile);
    await expect(accountCalls(client).profile()).resolves.toEqual(profile);
    expect(apiFetch).toHaveBeenCalledWith('/me/profile');
  });

  it('sends the profile, email and avatar changes to their /me paths', async () => {
    const { client, apiSend } = clientAnswering(profile);
    const calls = accountCalls(client);
    await calls.updateProfile({ full_name: 'Teacher One' });
    await calls.changeEmail({ email: 'two@example.com', current_password: 'x' });
    await calls.setAvatar({ path: upload.path });
    await calls.removeAvatar();
    expect(apiSend.mock.calls).toEqual([
      ['PATCH', '/me/profile', { full_name: 'Teacher One' }],
      ['PUT', '/me/email', { email: 'two@example.com', current_password: 'x' }],
      ['PUT', '/me/avatar', { path: upload.path }],
      ['DELETE', '/me/avatar', undefined],
    ]);
  });

  it('asks for a signed photo upload and writes the language', async () => {
    const uploads = clientAnswering(upload);
    const body = { mime: 'image/webp' as const, size: 10 };
    await expect(accountCalls(uploads.client).avatarUploadUrl(body)).resolves.toEqual(upload);
    expect(uploads.apiSend).toHaveBeenCalledWith('POST', '/me/avatar/upload-url', body);
    const locale = clientAnswering({ locale: 'en' });
    await expect(accountCalls(locale.client).setLocale({ locale: 'en' })).resolves.toEqual({
      locale: 'en',
    });
    expect(locale.apiSend).toHaveBeenCalledWith('PATCH', '/me/locale', { locale: 'en' });
  });

  it('answers nothing to a password change', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    const body = { current_password: 'a', new_password: 'Brand-new-9' };
    await expect(accountCalls(client).changePassword(body)).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenCalledWith('PUT', '/me/password', body);
  });

  it('throws bad_response for a profile with an unknown base role', async () => {
    const role = { ...profile.role, base: 'owner' };
    const { client } = clientAnswering({ ...profile, role });
    const failure = await accountCalls(client)
      .profile()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/me/profile' } });
  });
});
