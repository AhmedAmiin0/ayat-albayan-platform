import { fireEvent, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { StaffPhotoControl } from './StaffPhotoControl';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiSend: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
const mockUpload = jest.fn(async (path: string) => ({ data: { path }, error: null }));
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: mockUpload }) } } }));

const send = jest.mocked(apiSend);
const s = t.staffPhoto;
const base = '/teachers/t1/avatar';
const signed = { bucket: 'avatars', path: 'teachers/t1/avatar-1.jpg', token: 'tok', signed_url: 'http://x' };
const asset = { uri: 'file:///cache/t1.jpg', width: 600, height: 600, base64: 'aGVsbG8=', mimeType: 'image/jpeg' };
const KEY = ['teachers'];

const show = (photo: string | null) =>
  renderWithQuery(<StaffPhotoControl name="هدى سالم" id="t1" base={base} photo={photo} invalidate={[KEY]} />);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [asset] });
});

test('«تغيير الصورة»: the square-crop gallery, then upload-url → the signed upload → PUT, the photo shown', async () => {
  send.mockResolvedValueOnce(signed).mockResolvedValueOnce({ avatar_url: 'https://cdn/t1.jpg' });
  const { client } = await show(null);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await fireEvent.press(screen.getByRole('button', { name: s.change }));
  expect(await screen.findByText(s.saved)).toBeTruthy();
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }));
  expect(send.mock.calls).toEqual([
    ['POST', `${base}/upload-url`, { mime: 'image/jpeg', size: 5 }],
    ['PUT', base, { path: signed.path }],
  ]);
  expect(mockUpload).toHaveBeenCalledWith(signed.path, 'tok', expect.any(ArrayBuffer), { contentType: 'image/jpeg' });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: KEY });
  expect(screen.getByRole('image', { name: 'هدى سالم' }).props.source).toEqual({ uri: 'https://cdn/t1.jpg' });
});

test('«حذف الصورة» asks first; cancel sends nothing, confirm DELETEs and shows the initials', async () => {
  send.mockResolvedValueOnce({ avatar_url: null });
  await show('https://cdn/t1.jpg');
  await fireEvent.press(screen.getByRole('button', { name: s.remove }));
  expect(screen.getByText(s.confirmRemove.replace('{name}', 'هدى سالم'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(send).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: s.remove }));
  await fireEvent.press(screen.getByRole('button', { name: s.remove }));
  expect(await screen.findByText(s.removed)).toBeTruthy();
  expect(send).toHaveBeenCalledWith('DELETE', base);
  expect(screen.getByTestId('avatar-initials')).toBeTruthy();
  expect(screen.queryByRole('button', { name: s.remove })).toBeNull();
});

test('no photo: no «حذف الصورة»; a student or guardian login reads its own error', async () => {
  send.mockRejectedValueOnce(new ApiError(422, { code: 'avatar_not_staff' }));
  await show(null);
  expect(screen.queryByRole('button', { name: s.remove })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: s.change }));
  expect(await screen.findByText(s.errors.avatar_not_staff)).toBeTruthy();
});

test('a cancelled pick sends nothing', async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
  await show(null);
  await fireEvent.press(screen.getByRole('button', { name: s.change }));
  expect(send).not.toHaveBeenCalled();
});
