import { describe, expect, it } from 'vitest';
import { fakeS3 } from '@/common/storage/store/s3.fakes';
import type { MinioEnv } from '@/config/env/env.storage';
import { StorageHealth } from './storage-health';
import { StorageProbe } from './storage-probe';
import type { StorageService } from '@/common/storage/storage.service';

const MINIO: MinioEnv = {
  endpoint: 'http://m:9000',
  publicUrl: 'https://f.example.com',
  region: 'us-east-1',
  bucketPrefix: '',
  accessKey: 'k',
  secretKey: 's',
};

describe('«اختبار الاتصال» (docs/45)', () => {
  it('puts, reads back and deletes a probe object, leaving nothing behind', async () => {
    const s3 = fakeS3();
    const out = await new StorageProbe().run({ config: MINIO, storeOf: () => s3.store });
    expect(out.ok).toBe(true);
    expect(s3.sent.map((c) => c.constructor.name)).toEqual([
      'PutObjectCommand',
      'GetObjectCommand',
      'DeleteObjectCommand',
    ]);
    expect(s3.objects.size).toBe(0);
  });

  it('409 storage_not_configured without a full MinIO config', async () => {
    await expect(new StorageProbe().run({ config: null })).rejects.toMatchObject({
      status: 409,
      response: { message: 'storage_not_configured' },
    });
  });

  it('502 storage_probe_failed when MinIO refuses, with no detail of the failure', async () => {
    const s3 = fakeS3();
    s3.objects.set = () => {
      throw new Error('AccessDenied for key secret');
    };
    await expect(
      new StorageProbe().run({ config: MINIO, storeOf: () => s3.store }),
    ).rejects.toMatchObject({
      status: 502,
      response: { message: 'storage_probe_failed' },
    });
  });
});

describe('/health storage view', () => {
  const storage = (ping: () => Promise<void>) =>
    ({ writesTo: () => 'minio', ping }) as unknown as StorageService;

  it('ok / down, asked at most every 30 s', async () => {
    let calls = 0;
    const health = new StorageHealth(
      storage(() => (calls++ ? Promise.reject(new Error('x')) : Promise.resolve())),
    );
    expect(await health.view(0)).toEqual({ driver: 'minio', status: 'ok' });
    expect(await health.view(10_000)).toEqual({ driver: 'minio', status: 'ok' });
    expect(await health.view(31_000)).toEqual({ driver: 'minio', status: 'down' });
    expect(calls).toBe(2);
  });
});
