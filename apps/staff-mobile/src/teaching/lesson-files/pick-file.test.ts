import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@ab/mobile-kit';
import { ensureCameraPermission } from '@/payments';
import { pickFile } from './pick-file';

jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@/payments', () => ({ ensureCameraPermission: jest.fn() }));

const library = jest.mocked(ImagePicker.launchImageLibraryAsync);
const camera = jest.mocked(ImagePicker.launchCameraAsync);
const documents = jest.mocked(DocumentPicker.getDocumentAsync);
const allowed = jest.mocked(ensureCameraPermission);
const photo = { uri: 'file:///cache/p.jpg', width: 9, height: 9, mimeType: 'image/jpeg' };
const pdf = { uri: 'file:///cache/w.pdf', name: 'ورقة الواجب.pdf', mimeType: 'application/pdf', lastModified: 0 };

const realFetch = globalThis.fetch;
const fetchMock = jest.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(7) }));
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

test('a gallery photo: quality 0.8 images, its bytes read from the uri', async () => {
  library.mockResolvedValue({ canceled: false, assets: [{ ...photo, fileName: 'IMG_1.jpg' }] });
  const file = await pickFile('gallery');
  expect(library).toHaveBeenCalledWith({ mediaTypes: 'images', quality: 0.8 });
  expect(fetchMock).toHaveBeenCalledWith('file:///cache/p.jpg');
  expect(file).toMatchObject({ name: 'IMG_1.jpg', mime: 'image/jpeg', size: 7 });
});

test('the camera asks its permission with the lesson’s reason; a shot without a name', async () => {
  allowed.mockResolvedValue(true);
  camera.mockResolvedValue({ canceled: false, assets: [photo] });
  const file = await pickFile('camera');
  expect(allowed).toHaveBeenCalledWith({
    rationale: t.lessonFiles.cameraRationale, confirm: t.inbox.composer.takePhoto,
  });
  expect(file).toMatchObject({ name: 'photo.jpg', mime: 'image/jpeg', size: 7 });
});

test('a refused camera never opens', async () => {
  allowed.mockResolvedValue(false);
  await expect(pickFile('camera')).resolves.toBeNull();
  expect(camera).not.toHaveBeenCalled();
});

test('a document: PDF, audio or image, under its own name', async () => {
  documents.mockResolvedValue({ canceled: false, assets: [pdf] });
  const file = await pickFile('document');
  expect(documents).toHaveBeenCalledWith({
    type: ['application/pdf', 'audio/*', 'image/*'], copyToCacheDirectory: true,
  });
  expect(file).toMatchObject({ name: 'ورقة الواجب.pdf', mime: 'application/pdf', size: 7 });
});

test('backing out of a picker is null, nothing read', async () => {
  library.mockResolvedValue({ canceled: true, assets: null });
  documents.mockResolvedValue({ canceled: true, assets: null });
  await expect(pickFile('gallery')).resolves.toBeNull();
  await expect(pickFile('document')).resolves.toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
