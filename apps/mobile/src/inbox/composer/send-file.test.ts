import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ChatFileError, fileError, pdfName, pickChatFile, sendChatFile, type ChatFilePick } from './send-file';
import { PHONE } from '../shared/thread-fixtures';

const mockApiSend = jest.fn();
const mockUpload = jest.fn();
const mockFrom = jest.fn((bucket: string) => ({ bucket, uploadToSignedUrl: mockUpload }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { storage: { from: (b: string) => mockFrom(b) } } }));
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const library = jest.mocked(ImagePicker.launchImageLibraryAsync);
const documents = jest.mocked(DocumentPicker.getDocumentAsync);
const ID = '0b6f8d1e-6c1a-4a8e-9a57-2f8d1c3b4a5e';
const MB = 1024 * 1024;
const pdf: ChatFilePick = { mime: 'application/pdf', bytes: new ArrayBuffer(3), size: 3, filename: 'خطة.pdf' };
const signed = { bucket: 'wa-media', path: `out/u1/${ID}/x.pdf`, token: 'tok', signed_url: 'https://s.test/up' };
const pdfAsset = { name: 'a/b\\خطة الحفظ.pdf', uri: 'file:///cache/plan.pdf', mimeType: 'application/pdf', lastModified: 0 };

const realFetch = globalThis.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  mockUpload.mockResolvedValue({ data: {}, error: null });
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('a photo: the gallery, compressed as a receipt, named for its type', async () => {
  library.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///p.png', width: 1, height: 1, base64: 'aGVsbG8=', mimeType: 'image/png' }] });
  await expect(pickChatFile('image', 10 * MB)).resolves.toMatchObject({ mime: 'image/png', size: 5, filename: 'photo.png' });
  expect(library).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: 'images', exif: false }));
});

test('a PDF: the document picker, its cached copy read as bytes, a safe name', async () => {
  documents.mockResolvedValue({ canceled: false, assets: [pdfAsset] });
  const fetchMock = jest.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(7) }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await expect(pickChatFile('pdf', 10 * MB)).resolves.toMatchObject({ mime: 'application/pdf', size: 7, filename: 'a_b_خطة الحفظ.pdf' });
  expect(documents).toHaveBeenCalledWith({ type: 'application/pdf', copyToCacheDirectory: true });
  expect(fetchMock).toHaveBeenCalledWith('file:///cache/plan.pdf');
});

test('a PDF over the limit is refused from its picked size, before its bytes are read', async () => {
  documents.mockResolvedValue({ canceled: false, assets: [{ ...pdfAsset, size: 80 * MB }] });
  const fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await expect(pickChatFile('pdf', 10 * MB)).rejects.toEqual(new ChatFileError('file_too_large'));
  expect(fetchMock).not.toHaveBeenCalled();
});

test('cancelled pickers send nothing', async () => {
  documents.mockResolvedValue({ canceled: true, assets: null });
  library.mockResolvedValue({ canceled: true, assets: null });
  await expect(pickChatFile('pdf', 10 * MB)).resolves.toBeNull();
  await expect(pickChatFile('image', 10 * MB)).resolves.toBeNull();
});

test('pdfName: no separators, at most 200 characters, never empty', () => {
  expect(pdfName('  ')).toBe('file.pdf');
  expect(pdfName(undefined)).toBe('file.pdf');
  expect(pdfName('خطة\nالشهر.pdf')).toBe('خطة_الشهر.pdf');
  expect(pdfName('x'.repeat(250))).toHaveLength(200);
});

test('send: the signed upload, then the file under the same clientRequestId, no caption', async () => {
  mockApiSend.mockResolvedValueOnce(signed).mockResolvedValueOnce({ id: 'row' });
  await expect(sendChatFile({ phone: PHONE, file: pdf, id: ID, maxBytes: 10 * MB })).resolves.toEqual({ id: 'row' });
  expect(mockApiSend).toHaveBeenNthCalledWith(1, 'POST', '/threads/%2B966552147730/file-upload-url', {
    clientRequestId: ID,
    mime: 'application/pdf',
    size: 3,
  });
  expect(mockFrom).toHaveBeenCalledWith('wa-media');
  expect(mockUpload).toHaveBeenCalledWith(signed.path, 'tok', pdf.bytes, { contentType: 'application/pdf' });
  expect(mockApiSend).toHaveBeenNthCalledWith(2, 'POST', '/threads/%2B966552147730/file', {
    clientRequestId: ID,
    path: signed.path,
    filename: 'خطة.pdf',
  });
});

test('refused before any request: too large (an image over Meta’s 5 MB) or the wrong type', async () => {
  const big = { ...pdf, mime: 'image/jpeg', size: 6 * MB };
  await expect(sendChatFile({ phone: PHONE, file: big, id: ID, maxBytes: 10 * MB })).rejects.toEqual(
    new ChatFileError('file_too_large'),
  );
  const webp = { ...pdf, mime: 'image/webp' };
  await expect(sendChatFile({ phone: PHONE, file: webp, id: ID, maxBytes: 10 * MB })).rejects.toEqual(
    new ChatFileError('file_type'),
  );
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a PDF follows the academy’s own limit', async () => {
  await expect(sendChatFile({ phone: PHONE, file: { ...pdf, size: 3 * MB }, id: ID, maxBytes: 2 * MB })).rejects.toEqual(
    new ChatFileError('file_too_large'),
  );
});

test('Storage refusing the bytes is file_upload, and the file is never sent', async () => {
  mockApiSend.mockResolvedValueOnce(signed);
  mockUpload.mockResolvedValue({ data: null, error: new Error('denied') });
  const sent = sendChatFile({ phone: PHONE, file: pdf, id: ID, maxBytes: 10 * MB });
  await expect(sent).rejects.toEqual(new ChatFileError('file_upload'));
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});

test('fileError: inbox.error.<code> for ours and for the API’s', () => {
  expect(fileError(new ChatFileError('file_upload'))).toBe(t.inbox.error.file_upload);
  expect(fileError(new ApiError(403, { code: 'files_forbidden' }))).toBe(t.inbox.error.files_forbidden);
  expect(fileError(new ApiError(409, { code: 'session_closed' }))).toBe(t.inbox.error.session_closed);
  expect(fileError(new Error('x'))).toBe(t.inbox.error.send_failed);
});
