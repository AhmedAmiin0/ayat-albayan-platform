import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadSigned } from './upload-slot';

const uploadToSignedUrl = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn(() => ({ uploadToSignedUrl })));
vi.mock('@/lib/http/supabase', () => ({ supabase: { storage: { from } } }));

const OLD = { bucket: 'receipts', path: 'sub-1/a.jpg', token: 'tok', signed_url: 'https://sb/x' };
const MINIO = { ...OLD, path: 'minio:sub-1/a.jpg', signed_url: 'https://files.test/put?sig=1' };
const FILE = { body: new Blob(['x']), contentType: 'image/jpeg' };

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('uploadSigned', () => {
  it('sends an unmarked path to Supabase Storage with its bucket, path, token and type', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: null });
    expect(await uploadSigned(OLD, FILE)).toEqual({ error: null });
    expect(from).toHaveBeenCalledWith('receipts');
    expect(uploadToSignedUrl).toHaveBeenCalledWith('sub-1/a.jpg', 'tok', FILE.body, { contentType: 'image/jpeg' });
  });

  it('PUTs a «minio:» path to its signed URL and never calls Supabase', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await uploadSigned(MINIO, FILE)).toEqual({ error: null });
    expect(fetchMock).toHaveBeenCalledWith(MINIO.signed_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', 'If-None-Match': '*' },
      body: FILE.body,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns the Supabase error', async () => {
    const error = new Error('denied');
    uploadToSignedUrl.mockResolvedValue({ error });
    expect(await uploadSigned(OLD, FILE)).toEqual({ error });
  });

  it('returns an error when MinIO refuses the PUT', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 403 })));
    const { error } = await uploadSigned(MINIO, FILE);
    expect(error?.message).toBe('upload failed: 403');
  });
});
