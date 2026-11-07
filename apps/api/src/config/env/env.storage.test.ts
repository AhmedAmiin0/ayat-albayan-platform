import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';
import { storageEnv } from './env.storage';

const BASE = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const MINIO = {
  MINIO_ENDPOINT: 'http://ayat-minio:9000/',
  MINIO_PUBLIC_URL: 'https://files.example.com',
  MINIO_ACCESS_KEY: 'ayat-app',
  MINIO_SECRET_KEY: 'not-a-real-secret',
};

describe('storage config (docs/45)', () => {
  it('defaults to supabase with no MinIO (nothing changes until the cut-over)', () => {
    expect(storageEnv(loadEnv(BASE))).toEqual({ driver: 'supabase', minio: null });
  });

  it('a full MinIO config: endpoint trimmed, region and prefix defaulted', () => {
    const env = storageEnv(loadEnv({ ...BASE, ...MINIO, STORAGE_DRIVER: 'minio' }));
    expect(env).toEqual({
      driver: 'minio',
      minio: {
        endpoint: 'http://ayat-minio:9000',
        publicUrl: 'https://files.example.com',
        region: 'us-east-1',
        bucketPrefix: '',
        accessKey: 'ayat-app',
        secretKey: 'not-a-real-secret',
      },
    });
  });

  it('a missing secret leaves MinIO unconfigured (a write then fails, never silently)', () => {
    const { MINIO_SECRET_KEY: _drop, ...rest } = MINIO;
    expect(storageEnv(loadEnv({ ...BASE, ...rest, STORAGE_DRIVER: 'minio' })).minio).toBeNull();
  });

  it('an invalid value fails the env schema (a DB value would be dropped from the overlay)', () => {
    expect(() => loadEnv({ ...BASE, STORAGE_DRIVER: 's3' })).toThrow();
    expect(() => loadEnv({ ...BASE, MINIO_PUBLIC_URL: 'http://files.example.com' })).toThrow();
  });
});
