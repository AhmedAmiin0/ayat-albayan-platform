import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import type { StorageEnv } from '@/config/env/env.storage';
import { withUploadClient } from './slots/upload-client';
import { StorageService } from './storage.service';
import { fakeS3 } from './store/s3.fakes';
import { StoreSource } from './store/store-source';

const MINIO = {
  endpoint: 'http://m:9000',
  publicUrl: 'https://f.example.com',
  region: 'us-east-1',
  bucketPrefix: '',
  accessKey: 'k',
  secretKey: 's',
};
const SLOT = { bucket: 'receipts', path: 'sub/a.jpg', file: { size: 900, mime: 'image/jpeg' } };

function setup(config: StorageEnv) {
  const supabase = fakeS3();
  const minio = fakeS3();
  const source = new StoreSource({
    supabase: supabase.store,
    config: () => config,
    minio: () => minio.store,
  });
  return { supabase, minio, storage: new StorageService({} as Db, source) };
}

const ON: StorageEnv = { driver: 'minio', minio: MINIO, recordings: false, driveBackup: false };

// Pre-cut-over review items 1 and 9 (docs/45 §4 step 9).
describe('upload slots after the switch', () => {
  it('a client declaring X-AB-Upload: slot-v2 gets a MinIO slot', async () => {
    const t = setup(ON);
    const signed = await withUploadClient('slot-v2', () => t.storage.signedUpload(SLOT as never));
    expect(signed.path).toBe('minio:sub/a.jpg');
    expect(signed.token).toBe('');
  });

  it('an older client (no header, or another value) still gets a Supabase slot', async () => {
    const t = setup(ON);
    const bare = await t.storage.signedUpload(SLOT as never);
    const other = await withUploadClient('v1', () => t.storage.signedUpload(SLOT as never));
    expect([bare.path, other.path]).toEqual(['sub/a.jpg', 'sub/a.jpg']);
  });

  it('before the switch every client gets a Supabase slot, as before', async () => {
    const t = setup({ driver: 'supabase', minio: MINIO, recordings: false, driveBackup: false });
    const signed = await withUploadClient('slot-v2', () => t.storage.signedUpload(SLOT as never));
    expect(signed.path).toBe('sub/a.jpg');
  });

  it('a MinIO slot outside the bucket rule (too big, other type) is refused', async () => {
    const t = setup(ON);
    const big = { ...SLOT, file: { size: 11 * 1024 * 1024, mime: 'image/jpeg' } };
    const html = { ...SLOT, file: { size: 10, mime: 'text/html' } };
    const sign = (s: typeof SLOT) =>
      withUploadClient('slot-v2', () => t.storage.signedUpload(s as never));
    await expect(sign(big)).rejects.toThrow('storage slot refused');
    await expect(sign(html)).rejects.toThrow('storage slot refused');
  });
});

// Item 6: a «minio:» path while MinIO is not configured is a missing object, never a sync throw.
describe('a «minio:» path without a MinIO config', () => {
  const ref = { bucket: 'receipts', path: 'minio:sub/a.jpg' } as const;

  it('exists → false, info / head → null, remove rejects (no synchronous throw)', async () => {
    const t = setup({ driver: 'supabase', minio: null, recordings: false, driveBackup: false });
    expect(await t.storage.exists(ref)).toBe(false);
    expect(await t.storage.info(ref)).toBeNull();
    expect(await t.storage.head(ref, 8)).toBeNull();
    const removing = t.storage.remove(ref);
    await expect(removing).rejects.toThrow('storage_not_configured');
  });
});
