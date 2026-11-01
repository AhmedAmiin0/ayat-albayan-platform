import * as ImagePicker from 'expo-image-picker';
import { ensureCameraPermission } from './camera-permission';
import { pickReceipt, toReceipt } from './receipt';

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('./camera-permission', () => ({ ensureCameraPermission: jest.fn() }));

const camera = jest.mocked(ImagePicker.launchCameraAsync);
const library = jest.mocked(ImagePicker.launchImageLibraryAsync);
const allowed = jest.mocked(ensureCameraPermission);

// "hello" in base64: 5 bytes.
const asset = (over: Partial<ImagePicker.ImagePickerAsset> = {}): ImagePicker.ImagePickerAsset => ({
  uri: 'file:///cache/receipt.jpg',
  width: 1200,
  height: 1600,
  base64: 'aGVsbG8=',
  mimeType: 'image/jpeg',
  ...over,
});
const picked = (a: ImagePicker.ImagePickerAsset) => ({ canceled: false as const, assets: [a] });

beforeEach(() => jest.clearAllMocks());

test('toReceipt: the decoded bytes and their exact size', () => {
  const receipt = toReceipt(asset());
  expect(receipt?.size).toBe(5);
  expect(new TextDecoder().decode(receipt?.bytes)).toBe('hello');
  expect(receipt).toMatchObject({ uri: 'file:///cache/receipt.jpg', mime: 'image/jpeg' });
});

test('toReceipt: a bucket image type is kept; anything else uploads as JPEG', () => {
  expect(toReceipt(asset({ mimeType: 'image/png' }))?.mime).toBe('image/png');
  expect(toReceipt(asset({ mimeType: 'image/gif' }))?.mime).toBe('image/jpeg');
  expect(toReceipt(asset({ mimeType: 'image/heic' }))?.mime).toBe('image/jpeg');
  expect(toReceipt(asset({ mimeType: 'application/pdf' }))?.mime).toBe('image/jpeg');
  expect(toReceipt(asset({ mimeType: undefined }))?.mime).toBe('image/jpeg');
});

test('toReceipt: no bytes, no receipt', () => {
  expect(toReceipt(asset({ base64: null }))).toBeNull();
});

test('camera: compressed, base64, no EXIF, after the permission', async () => {
  allowed.mockResolvedValue(true);
  camera.mockResolvedValue(picked(asset()));
  await expect(pickReceipt('camera')).resolves.toMatchObject({ size: 5 });
  expect(camera).toHaveBeenCalledWith(
    expect.objectContaining({ mediaTypes: 'images', quality: 0.6, base64: true, exif: false }),
  );
});

test('camera refused: the camera never opens', async () => {
  allowed.mockResolvedValue(false);
  await expect(pickReceipt('camera')).resolves.toBeNull();
  expect(camera).not.toHaveBeenCalled();
});

test('gallery: no permission question; cancelled → null', async () => {
  library.mockResolvedValue(picked(asset({ uri: 'file:///cache/slip.png' })));
  await expect(pickReceipt('library')).resolves.toMatchObject({ uri: 'file:///cache/slip.png' });
  expect(allowed).not.toHaveBeenCalled();
  library.mockResolvedValue({ canceled: true, assets: null });
  await expect(pickReceipt('library')).resolves.toBeNull();
});
