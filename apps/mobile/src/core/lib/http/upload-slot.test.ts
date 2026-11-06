import { uploadSigned } from './upload-slot';

const mockUpload = jest.fn();
const mockFrom = jest.fn((_bucket: string) => ({ uploadToSignedUrl: mockUpload }));
// Lazy: the factory runs on the hoisted import, before the consts above exist.
jest.mock('./supabase', () => ({
  supabase: { storage: { from: (bucket: string) => mockFrom(bucket) } },
}));

const OLD = { bucket: 'receipts', path: 'sub-1/a.jpg', token: 'tok', signed_url: 'https://sb/x' };
const MINIO = { ...OLD, path: 'minio:sub-1/a.jpg', signed_url: 'https://files.test/put?sig=1' };
const FILE = { body: new ArrayBuffer(3), contentType: 'image/jpeg' };
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch;
});

test('an unmarked path goes to Supabase Storage with its bucket, path, token and type', async () => {
  mockUpload.mockResolvedValue({ error: null });
  expect(await uploadSigned(OLD, FILE)).toEqual({ error: null });
  expect(mockFrom).toHaveBeenCalledWith('receipts');
  expect(mockUpload).toHaveBeenCalledWith('sub-1/a.jpg', 'tok', FILE.body, { contentType: 'image/jpeg' });
  expect(mockFetch).not.toHaveBeenCalled();
});

test('a «minio:» path is a PUT to its signed URL; Supabase is not called', async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
  expect(await uploadSigned(MINIO, FILE)).toEqual({ error: null });
  expect(mockFetch).toHaveBeenCalledWith(MINIO.signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg', 'If-None-Match': '*' },
    body: FILE.body,
  });
  expect(mockFrom).not.toHaveBeenCalled();
});

test('a Supabase error comes back as the error', async () => {
  const error = new Error('denied');
  mockUpload.mockResolvedValue({ error });
  expect(await uploadSigned(OLD, FILE)).toEqual({ error });
});

test('a refused PUT comes back as an error', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 403 });
  const { error } = await uploadSigned(MINIO, FILE);
  expect(error?.message).toBe('upload failed: 403');
});
