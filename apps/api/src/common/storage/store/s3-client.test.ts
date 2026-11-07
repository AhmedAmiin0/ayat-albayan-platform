import { describe, expect, it } from 'vitest';
import { minioStore } from './s3-client';

const ENV = {
  endpoint: 'http://ayat-minio:9000',
  publicUrl: 'https://files.example.com',
  region: 'us-east-1',
  bucketPrefix: 'ab-',
  accessKey: 'ayat-app',
  secretKey: 'not-a-real-secret',
};

// Signing is local (SigV4, no request): the URL is for the PUBLIC host, path-style, short-lived.
describe('MinIO signed URLs (docs/45)', () => {
  it('a GET URL on the public host, the prefixed bucket, the given expiry and a save-as name', async () => {
    const url = new URL(
      await minioStore(ENV).signedGet({
        bucket: 'reports',
        key: 's1/l1.pdf',
        seconds: 300,
        download: 'تقرير.pdf',
      }),
    );
    expect(url.origin).toBe('https://files.example.com');
    expect(url.pathname).toBe('/ab-reports/s1/l1.pdf');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get('response-content-disposition')).toBe(
      `attachment; filename*=UTF-8''${encodeURIComponent('تقرير.pdf')}`,
    );
    expect(url.toString()).not.toContain('not-a-real-secret');
    expect(url.toString()).not.toContain('ayat-minio');
  });

  it('a PUT slot lives 15 minutes, one upload of exactly the declared file, no Supabase token', async () => {
    const file = { size: 900, mime: 'image/jpeg' };
    const slot = await minioStore(ENV).signedPut({ bucket: 'receipts', key: 's1/a.jpg', file });
    const url = new URL(slot.signedUrl);
    expect(slot.token).toBe('');
    expect(url.pathname).toBe('/ab-receipts/s1/a.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    const signed = (url.searchParams.get('X-Amz-SignedHeaders') ?? '').split(';');
    expect(signed).toEqual(expect.arrayContaining(['content-length', 'content-type', 'host']));
    expect(signed).toContain('if-none-match');
    // Size and type stay request headers the PUT must carry, never query values.
    expect(url.searchParams.has('Content-Length')).toBe(false);
    expect(url.searchParams.has('Content-Type')).toBe(false);
  });

  it('a PUT slot carries no checksum the browser or phone could not send', async () => {
    const file = { size: 900, mime: 'image/jpeg' };
    const slot = await minioStore(ENV).signedPut({ bucket: 'receipts', key: 's1/a.jpg', file });
    const url = new URL(slot.signedUrl);
    const keys = [...url.searchParams.keys()].map((k) => k.toLowerCase());
    expect(keys.filter((k) => k.startsWith('x-amz-checksum'))).toEqual([]);
    expect(keys).not.toContain('x-amz-sdk-checksum-algorithm');
    const signed = url.searchParams.get('X-Amz-SignedHeaders') ?? '';
    expect(signed).not.toMatch(/checksum/);
  });
});
