import * as ImagePicker from 'expo-image-picker';
import { t } from '@/core/lib/i18n/i18n';
import { ensureCameraPermission } from '@/payments/receipts/camera-permission';
import { pickAvatar, toAvatar } from './avatar';

jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('@/payments/receipts/camera-permission', () => ({ ensureCameraPermission: jest.fn() }));

const camera = jest.mocked(ImagePicker.launchCameraAsync);
const library = jest.mocked(ImagePicker.launchImageLibraryAsync);
const allowed = jest.mocked(ensureCameraPermission);

// "hello" in base64: 5 bytes.
const asset = (over: Partial<ImagePicker.ImagePickerAsset> = {}): ImagePicker.ImagePickerAsset => ({
  uri: 'file:///cache/me.jpg',
  width: 800,
  height: 800,
  base64: 'aGVsbG8=',
  mimeType: 'image/jpeg',
  ...over,
});

beforeEach(() => jest.clearAllMocks());

test('toAvatar (R-ACC-05): decoded bytes, size, a bucket type kept, anything else JPEG', () => {
  expect(toAvatar(asset())).toMatchObject({ uri: 'file:///cache/me.jpg', mime: 'image/jpeg', size: 5 });
  expect(toAvatar(asset({ mimeType: 'image/webp' }))?.mime).toBe('image/webp');
  expect(toAvatar(asset({ mimeType: 'image/heic' }))?.mime).toBe('image/jpeg');
  expect(toAvatar(asset({ base64: null }))).toBeNull();
});

test('the gallery needs no permission; a square crop is asked for', async () => {
  library.mockResolvedValue({ canceled: false, assets: [asset({ mimeType: 'image/png' })] });
  await expect(pickAvatar('library')).resolves.toMatchObject({ mime: 'image/png' });
  expect(allowed).not.toHaveBeenCalled();
  expect(library).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1], exif: false }));
});

test('the camera asks with the avatar reason; refused or cancelled gives null', async () => {
  allowed.mockResolvedValue(false);
  await expect(pickAvatar('camera')).resolves.toBeNull();
  expect(allowed).toHaveBeenCalledWith({ rationale: t.account.mobile.cameraRationale, confirm: t.account.avatar.camera });
  expect(camera).not.toHaveBeenCalled();
  allowed.mockResolvedValue(true);
  camera.mockResolvedValue({ canceled: true, assets: null });
  await expect(pickAvatar('camera')).resolves.toBeNull();
});
