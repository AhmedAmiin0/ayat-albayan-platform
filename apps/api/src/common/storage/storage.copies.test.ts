import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import type { StorageEnv } from '@/config/env/env.storage';
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
const BYTES = { body: new Uint8Array([1, 2, 3]), type: 'image/jpeg' };

function setup(config: StorageEnv) {
  const supabase = fakeS3();
  const minio = fakeS3();
  const source = new StoreSource({ supabase: supabase.store, config: () => config, minio: () => minio.store });
  return { supabase, minio, storage: new StorageService({} as Db, source) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Item 5: after the bulk copy (docs/45 §6) a Supabase object has a MinIO twin under the same key.
describe('deleting a Supabase path after the bulk copy', () => {
  it('removes the MinIO twin too (best effort)', async () => {
    const t = setup({ driver: 'minio', minio: MINIO, recordings: false });
    t.supabase.objects.set('ab-receipts/s/a.jpg', BYTES);
    t.minio.objects.set('ab-receipts/s/a.jpg', BYTES);
    await t.storage.remove({ bucket: 'receipts', path: 's/a.jpg' });
    await flush();
    expect(t.supabase.objects.size + t.minio.objects.size).toBe(0);
  });

  it('a «minio:» path is removed in MinIO only; Supabase keeps its key', async () => {
    const t = setup({ driver: 'minio', minio: MINIO, recordings: false });
    t.supabase.objects.set('ab-receipts/s/a.jpg', BYTES);
    t.minio.objects.set('ab-receipts/s/a.jpg', BYTES);
    await t.storage.removeMany({ bucket: 'receipts', paths: ['minio:s/a.jpg'] });
    await flush();
    expect([t.supabase.objects.size, t.minio.objects.size]).toEqual([1, 0]);
  });

  it('a MinIO that fails never fails the Supabase delete; none configured → Supabase only', async () => {
    const t = setup({ driver: 'supabase', minio: MINIO, recordings: false });
    t.minio.objects.delete = () => {
      throw new Error('down');
    };
    await expect(t.storage.remove({ bucket: 'receipts', path: 's/a.jpg' })).resolves.toBeUndefined();
    const plain = setup({ driver: 'supabase', minio: null, recordings: false });
    await plain.storage.remove({ bucket: 'receipts', path: 's/a.jpg' });
    expect(plain.minio.sent).toEqual([]);
  });
});

// Item 3: recordings are their own switch, never implied by STORAGE_DRIVER=minio.
describe('recordings into MinIO', () => {
  it('off with the driver on minio unless MINIO_RECORDINGS is on', () => {
    expect(setup({ driver: 'minio', minio: MINIO, recordings: false }).storage.recordsToMinio()).toBe(false);
    expect(setup({ driver: 'supabase', minio: MINIO, recordings: true }).storage.recordsToMinio()).toBe(false);
    const on = setup({ driver: 'minio', minio: MINIO, recordings: true }).storage;
    expect(on.recordsToMinio()).toBe(true);
    expect(on.egressTarget('recordings')).toMatchObject({ bucket: 'recordings' });
  });

  it('no egress target while the switch is off', () => {
    const off = setup({ driver: 'minio', minio: MINIO, recordings: false }).storage;
    expect(off.egressTarget('recordings')).toBeNull();
  });
});
