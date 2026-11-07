import { describe, expect, it } from 'vitest';
import type { StorageEnv } from '@/config/env/env.storage';
import type { Db } from '@/common/db/db.module';
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
const PDF = new TextEncoder().encode('%PDF-1.7');

function setup(config: StorageEnv) {
  const supabase = fakeS3();
  const minio = fakeS3();
  const env = { config };
  const source = new StoreSource({
    supabase: supabase.store,
    config: () => env.config,
    minio: () => minio.store,
  });
  return { supabase, minio, env, storage: new StorageService({} as Db, source) };
}

describe('StorageService routes by the stored path’s marker (docs/45)', () => {
  it('before the switch: writes to Supabase and keeps the bare path', async () => {
    const t = setup({ driver: 'supabase', minio: MINIO });
    expect(
      await t.storage.upload({
        bucket: 'reports',
        path: 's/l.pdf',
        body: PDF,
        contentType: 'application/pdf',
      }),
    ).toBe('s/l.pdf');
    expect(t.supabase.objects.size).toBe(1);
    expect(t.minio.objects.size).toBe(0);
  });

  it('after the switch: every write goes to MinIO and the path to keep is «minio:…»', async () => {
    const t = setup({ driver: 'minio', minio: MINIO });
    expect(
      await t.storage.upload({
        bucket: 'reports',
        path: 's/l.pdf',
        body: PDF,
        contentType: 'application/pdf',
      }),
    ).toBe('minio:s/l.pdf');
    expect((await t.storage.signedUpload({ bucket: 'receipts', path: 'sub/a.jpg' })).path).toBe(
      'minio:sub/a.jpg',
    );
    expect(t.storage.storedPathFor('pdf/m/1.jpg')).toBe('minio:pdf/m/1.jpg');
    expect(t.supabase.objects.size).toBe(0);
  });

  it('an old Supabase file stays readable after the switch; a new one is read from MinIO', async () => {
    const t = setup({ driver: 'supabase', minio: MINIO });
    const old = await t.storage.upload({
      bucket: 'reports',
      path: 'old.pdf',
      body: PDF,
      contentType: 'application/pdf',
    });
    t.env.config = { driver: 'minio', minio: MINIO };
    const fresh = await t.storage.upload({
      bucket: 'reports',
      path: 'new.pdf',
      body: PDF,
      contentType: 'application/pdf',
    });
    expect(await t.storage.download({ bucket: 'reports', path: old })).toEqual(PDF);
    expect(await t.storage.download({ bucket: 'reports', path: fresh })).toEqual(PDF);
    expect(await t.storage.download({ bucket: 'reports', path: 'new.pdf' })).toBeNull();
    const urls = await t.storage.signedDownloads({
      bucket: 'reports',
      paths: [old, fresh],
      seconds: 60,
    });
    expect([...urls.keys()]).toEqual([old, fresh]);
    await t.storage.removeMany({ bucket: 'reports', paths: [old, fresh] });
    expect(t.supabase.objects.size + t.minio.objects.size).toBe(0);
  });

  it('copies an old Supabase file into MinIO (read, write) and is idempotent', async () => {
    const t = setup({ driver: 'supabase', minio: MINIO });
    await t.storage.upload({
      bucket: 'wa-media',
      path: 'm1.pdf',
      body: PDF,
      contentType: 'application/pdf',
    });
    t.env.config = { driver: 'minio', minio: MINIO };
    const to = { bucket: 'invoices', path: 'req/wa-m1.pdf' } as const;
    expect(await t.storage.copy({ from: { bucket: 'wa-media', path: 'm1.pdf' }, to })).toBe(
      'minio:req/wa-m1.pdf',
    );
    expect(await t.storage.info({ bucket: 'invoices', path: 'minio:req/wa-m1.pdf' })).toEqual({
      size: 8,
      contentType: 'application/pdf',
    });
    expect(await t.storage.copy({ from: { bucket: 'wa-media', path: 'm1.pdf' }, to })).toBe(
      'minio:req/wa-m1.pdf',
    );
  });

  it('switched to MinIO without its config: a write fails loudly, never falls back to Supabase', async () => {
    const t = setup({ driver: 'minio', minio: null });
    await expect(
      t.storage.upload({
        bucket: 'reports',
        path: 'x.pdf',
        body: PDF,
        contentType: 'application/pdf',
      }),
    ).rejects.toThrow('storage_not_configured');
    expect(t.supabase.objects.size).toBe(0);
  });
});
