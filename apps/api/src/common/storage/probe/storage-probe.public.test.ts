import { describe, expect, it } from 'vitest';
import { fakeS3 } from '@/common/storage/store/s3.fakes';
import type { MinioEnv } from '@/config/env/env.storage';
import { StorageProbe } from './storage-probe';
import { publicHttp } from './storage-probe.fakes';

const MINIO: MinioEnv = {
  endpoint: 'http://m:9000',
  publicUrl: 'https://f.example.com',
  region: 'us-east-1',
  bucketPrefix: '',
  accessKey: 'k',
  secretKey: 's',
};

// Item 10 of the pre-cut-over review: a wrong MINIO_PUBLIC_URL must fail «اختبار الاتصال».
describe('«اختبار الاتصال» through the public URL (docs/45)', () => {
  it('PUTs to a signed slot as the apps do, GETs it back signed, and deletes it', async () => {
    const s3 = fakeS3();
    const http = publicHttp();
    await new StorageProbe().run({ config: MINIO, storeOf: () => s3.store, fetch: http });
    expect(http.calls.map((c) => c.method)).toEqual(['PUT', 'GET']);
    expect(http.calls[0]?.url).toMatch(/^https:\/\/files\.example\.com\/ab-reports\/_probe\//);
    expect(http.calls[0]?.headers).toMatchObject({
      'content-type': 'application/pdf',
      'if-none-match': '*',
    });
    expect(http.calls[1]?.url).toMatch(/_probe\/[0-9a-f-]+\.pdf/);
    expect(s3.objects.size).toBe(0);
  });

  it('502 storage_public_failed when the public host refuses the PUT; the object is removed', async () => {
    const s3 = fakeS3();
    const http = publicHttp(403);
    await expect(
      new StorageProbe().run({ config: MINIO, storeOf: () => s3.store, fetch: http }),
    ).rejects.toMatchObject({ status: 502, response: { message: 'storage_public_failed' } });
    expect(http.calls.map((c) => c.method)).toEqual(['PUT']);
    expect(s3.sent.at(-1)?.constructor.name).toBe('DeleteObjectCommand');
  });

  it('502 storage_public_failed when the public host cannot be reached', async () => {
    const s3 = fakeS3();
    const http = () => Promise.reject(new TypeError('fetch failed'));
    await expect(
      new StorageProbe().run({ config: MINIO, storeOf: () => s3.store, fetch: http }),
    ).rejects.toMatchObject({ status: 502, response: { message: 'storage_public_failed' } });
  });
});
