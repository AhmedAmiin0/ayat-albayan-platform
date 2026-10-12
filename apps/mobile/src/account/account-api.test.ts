import { apiSend } from '@/lib/api';
import { profileFixture } from '@/test/account';
import { AvatarUploadError, uploadAvatar } from './account-api';
import type { PickedAvatar } from './avatar';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiSend: jest.fn() }));
const mockUpload = jest.fn();
const mockFrom = jest.fn((bucket: string) => ({ bucket, uploadToSignedUrl: mockUpload }));
jest.mock('@/lib/supabase', () => ({ supabase: { storage: { from: (b: string) => mockFrom(b) } } }));

const send = jest.mocked(apiSend);
const avatar: PickedAvatar = { uri: 'file:///cache/me.jpg', mime: 'image/jpeg', bytes: new Uint8Array([1, 2, 3]).buffer, size: 3 };
const signed = { bucket: 'avatars', path: 'u1/avatar-1760000000000.jpg', token: 'tok', signed_url: 'http://x/sign?token=tok' };

beforeEach(() => jest.clearAllMocks());

test('R-ACC-05: upload-url, the signed upload, then PUT /me/avatar with the path', async () => {
  const saved = { ...profileFixture, avatar_url: 'https://cdn/avatar.jpg' };
  send.mockResolvedValueOnce(signed).mockResolvedValueOnce(saved);
  mockUpload.mockResolvedValue({ data: { path: signed.path }, error: null });
  await expect(uploadAvatar(avatar)).resolves.toEqual(saved);
  expect(send).toHaveBeenNthCalledWith(1, 'POST', '/me/avatar/upload-url', { mime: 'image/jpeg', size: 3 });
  expect(mockFrom).toHaveBeenCalledWith('avatars');
  expect(mockUpload).toHaveBeenCalledWith(signed.path, 'tok', avatar.bytes, { contentType: 'image/jpeg' });
  expect(send).toHaveBeenNthCalledWith(2, 'PUT', '/me/avatar', { path: signed.path });
});

test('Storage refusing the file stops before PUT /me/avatar', async () => {
  send.mockResolvedValueOnce(signed);
  mockUpload.mockResolvedValue({ data: null, error: { message: 'too big' } });
  await expect(uploadAvatar(avatar)).rejects.toBeInstanceOf(AvatarUploadError);
  expect(send).toHaveBeenCalledTimes(1);
});
