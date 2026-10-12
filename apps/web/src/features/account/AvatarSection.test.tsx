import { AVATAR_MAX_BYTES } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { domainError, PROFILE, renderWithClient, section } from './account-test-kit';
import { AccountPage } from './AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const A = t.account.avatar;
const SIGNED = { bucket: 'avatars', path: 'u1/avatar-1.png', token: 'tok', signed_url: 'https://sb.test/up' };
const SAVED = { ...PROFILE, avatar_url: 'https://sb.test/avatars/u1/avatar-1.png' };

beforeEach(() => {
  apiFetch.mockReset().mockResolvedValue(PROFILE);
  apiSend.mockReset();
  uploadToSignedUrl.mockReset().mockResolvedValue({ data: {}, error: null });
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

const png = (size = 1024, type = 'image/png') => {
  const f = new File(['x'], 'me.png', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
async function avatarSection() {
  renderWithClient(<AccountPage />);
  await screen.findByRole('region', { name: A.title });
  const s = section(A.title);
  const pick = (file: File) => fireEvent.change(s.getByLabelText(A.choose), { target: { files: [file] } });
  return { s, pick };
}

describe('AvatarSection (R-ACC-05)', () => {
  it('a file larger than 2 MB is refused here: no upload URL is asked for', async () => {
    const { s, pick } = await avatarSection();
    pick(png(AVATAR_MAX_BYTES + 1));
    expect(s.getByText(t.account.errors.avatar_too_large)).toBeTruthy();
    expect(s.queryByRole('button', { name: A.upload })).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a GIF is refused here', async () => {
    const { s, pick } = await avatarSection();
    pick(png(10, 'image/gif'));
    expect(s.getByText(t.account.errors.avatar_type)).toBeTruthy();
  });

  it('pick → preview → upload: signed URL, storage, PUT /me/avatar, toast, the saved photo', async () => {
    const { s, pick } = await avatarSection();
    const file = png();
    pick(file);
    expect(s.getByRole('img', { name: A.preview }).getAttribute('src')).toBe('blob:preview');
    apiSend.mockImplementation((method: string) => Promise.resolve(method === 'POST' ? SIGNED : SAVED));
    apiFetch.mockResolvedValue(SAVED);
    fireEvent.click(s.getByRole('button', { name: A.upload }));
    expect(await screen.findByText(t.account.toast.avatar)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/me/avatar/upload-url', { mime: 'image/png', size: 1024 });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(SIGNED.path, 'tok', file, { contentType: 'image/png' });
    expect(apiSend).toHaveBeenCalledWith('PUT', '/me/avatar', { path: SIGNED.path });
    const saved = await s.findByRole('img', { name: A.alt.replace('{name}', PROFILE.full_name) });
    expect(saved.getAttribute('src')).toBe(SAVED.avatar_url);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('a server refusal (avatar_type) is shown under the photo', async () => {
    const { s, pick } = await avatarSection();
    pick(png());
    apiSend.mockImplementation((method: string) => (method === 'POST' ? Promise.resolve(SIGNED) : Promise.reject(domainError(400, 'avatar_type'))));
    fireEvent.click(s.getByRole('button', { name: A.upload }));
    expect(await s.findByText(t.account.errors.avatar_type)).toBeTruthy();
  });

  it('«إزالة الصورة»: DELETE /me/avatar and a toast', async () => {
    apiFetch.mockResolvedValue(SAVED);
    const { s } = await avatarSection();
    apiSend.mockResolvedValue(PROFILE);
    fireEvent.click(s.getByRole('button', { name: A.remove }));
    expect(await screen.findByText(t.account.toast.avatarRemoved)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('DELETE', '/me/avatar');
  });
});
