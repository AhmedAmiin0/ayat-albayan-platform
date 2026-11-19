import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { pickChannelImage, pickChannelPdf } from './channel-pickers';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
}));

const asset = (over: Record<string, unknown>) => ({
  uri: 'file:///a',
  width: 10,
  height: 10,
  base64: 'AAEC',
  ...over,
});

test('a PDF with its own name, its bytes from base64; cancelled → null', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
    canceled: false,
    assets: [
      { name: 'خطة.pdf', uri: 'file:///a.pdf', mimeType: 'application/pdf', lastModified: 0, base64: 'AAEC' },
    ],
  });
  expect(await pickChannelPdf()).toMatchObject({ name: 'خطة.pdf', size: 3, mime: 'application/pdf' });
  const cancelled = { canceled: true, assets: null } as const;
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce(cancelled);
  expect(await pickChannelPdf()).toBeNull();
});

test('a photo from the phone’s photos: compressed JPEG bytes, no EXIF', async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
    canceled: false,
    assets: [asset({ mimeType: 'image/heic' })],
  });
  const file = await pickChannelImage('library');
  expect(file).toMatchObject({ mime: 'image/jpeg', name: 'photo.jpg', size: 3 });
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
    expect.objectContaining({ base64: true, exif: false }),
  );
});

test('the camera asks first: refused → nothing opens, null', async () => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({
    granted: false,
  } as never);
  expect(await pickChannelImage('camera')).toBeNull();
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({
    canceled: false,
    assets: [asset({})],
  });
  expect(await pickChannelImage('camera')).toMatchObject({ mime: 'image/jpeg', size: 3 });
});
