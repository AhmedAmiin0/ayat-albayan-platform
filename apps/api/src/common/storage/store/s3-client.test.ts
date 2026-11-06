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

  it('a PUT slot lives 15 minutes, one upload per key (If-None-Match signed) and has no Supabase token', async () => {
    const slot = await minioStore(ENV).signedPut({ bucket: 'receipts', key: 's1/a.jpg' });
    const url = new URL(slot.signedUrl);
    expect(slot.token).toBe('');
    expect(url.pathname).toBe('/ab-receipts/s1/a.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('if-none-match');
  });
});
