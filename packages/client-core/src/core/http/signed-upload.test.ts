import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignedUploadError, uploadToSlot } from './signed-upload.js';

const file = { body: new Uint8Array([1, 2, 3]), contentType: 'image/png' };
const slot = (path: string) => ({ bucket: 'receipts', path, token: 'tok', signed_url: 'https://files.example/put?sig=1' });

afterEach(() => vi.unstubAllGlobals());

describe('uploadToSlot (docs/45)', () => {
  it('an old-style path goes through the app’s Supabase upload, never fetch', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const supabase = vi.fn().mockResolvedValue(undefined);
    await uploadToSlot(slot('sub/a.png'), file, supabase);
    expect(supabase).toHaveBeenCalledWith(slot('sub/a.png'), file);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a «minio:» path is a PUT of the bytes with their mime type to the signed URL', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const supabase = vi.fn();
    await uploadToSlot(slot('minio:sub/a.png'), file, supabase);
    expect(supabase).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('https://files.example/put?sig=1', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png', 'If-None-Match': '*' },
      body: file.body,
    });
  });

  it('a refused PUT throws, so the caller never registers a missing file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    const e: unknown = await uploadToSlot(slot('minio:sub/a.png'), file, vi.fn()).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(SignedUploadError);
    expect(e instanceof SignedUploadError && e.status).toBe(403);
  });
});
