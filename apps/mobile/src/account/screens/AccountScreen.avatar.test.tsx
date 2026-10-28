import { fireEvent, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError, apiFetch, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { profileFixture, savedProfile } from '@/test/account';
import { renderWithQuery } from '@/test/query';
import { PROFILE_KEY } from '../hooks/queries';
import { AccountScreen } from './AccountScreen';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: jest.fn(), apiSend: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
const mockUpload = jest.fn(async (path: string) => ({ data: { path }, error: null }));
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: mockUpload }) } } }));

const send = jest.mocked(apiSend);
const a = t.account.avatar;
const signed = { bucket: 'avatars', path: 'u1/avatar-1.jpg', token: 'tok', signed_url: 'http://x' };
const photo = { uri: 'file:///cache/me.jpg', width: 600, height: 600, base64: 'aGVsbG8=', mimeType: 'image/jpeg' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [photo] });
});

test('R-ACC-05: initials, pick from the gallery, preview, upload-url then PUT /me/avatar, photo shown', async () => {
  jest.mocked(apiFetch).mockResolvedValue(profileFixture);
  const saved = savedProfile({ avatar_url: 'https://cdn/avatar.jpg' });
  send.mockResolvedValueOnce(signed).mockResolvedValueOnce(saved);
  const { client } = await renderWithQuery(<AccountScreen home="/more" />);
  expect(await screen.findByTestId('avatar-initials', { includeHiddenElements: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: a.library }));
  expect(await screen.findByText(a.preview)).toBeTruthy();
  expect(screen.getByTestId('avatar-photo').props.source).toEqual({ uri: photo.uri });
  await fireEvent.press(screen.getByRole('button', { name: a.upload }));
  expect(await screen.findByText(t.account.toast.avatar)).toBeTruthy();
  expect(send.mock.calls).toEqual([
    ['POST', '/me/avatar/upload-url', { mime: 'image/jpeg', size: 5 }],
    ['PUT', '/me/avatar', { path: signed.path }],
  ]);
  expect(mockUpload).toHaveBeenCalledWith(signed.path, 'tok', expect.any(ArrayBuffer), { contentType: 'image/jpeg' });
  expect(client.getQueryData(PROFILE_KEY)).toEqual(saved);
  expect(screen.getByTestId('avatar-photo').props.source).toEqual({ uri: 'https://cdn/avatar.jpg' });
});

test('the API refusing the type shows at the photo; «إلغاء» drops the preview', async () => {
  jest.mocked(apiFetch).mockResolvedValue(profileFixture);
  send.mockRejectedValueOnce(new ApiError(400, { code: 'avatar_type', message: 'x' }));
  await renderWithQuery(<AccountScreen home="/more" />);
  await fireEvent.press(await screen.findByRole('button', { name: a.library }));
  await fireEvent.press(await screen.findByRole('button', { name: a.upload }));
  expect(await screen.findByText(t.account.errors.avatar_type)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.account.cancel }));
  expect(screen.getByTestId('avatar-initials', { includeHiddenElements: true })).toBeTruthy();
});

test('«إزالة الصورة» sends DELETE /me/avatar and goes back to the initials', async () => {
  jest.mocked(apiFetch).mockResolvedValue(savedProfile({ avatar_url: 'https://cdn/avatar.jpg' }));
  send.mockResolvedValueOnce(profileFixture);
  await renderWithQuery(<AccountScreen home="/more" />);
  await fireEvent.press(await screen.findByRole('button', { name: a.remove }));
  expect(send).toHaveBeenCalledWith('DELETE', '/me/avatar');
  expect(await screen.findByText(t.account.toast.avatarRemoved)).toBeTruthy();
  expect(screen.getByTestId('avatar-initials', { includeHiddenElements: true })).toBeTruthy();
});
