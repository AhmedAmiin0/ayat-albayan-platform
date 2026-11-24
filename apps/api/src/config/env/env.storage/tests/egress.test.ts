import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env/env';
import { egressKeyWarning, storageEnv } from '@/config/env/env.storage/env.storage';

const BASE = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const MINIO = {
  MINIO_ENDPOINT: 'http://ayat-minio:9000/',
  MINIO_PUBLIC_URL: 'https://files.example.com',
  MINIO_ACCESS_KEY: 'ayat-app',
  MINIO_SECRET_KEY: 'not-a-real-secret',
};
const EGRESS = { MINIO_EGRESS_ACCESS_KEY: 'ayat-egress', MINIO_EGRESS_SECRET_KEY: 'not-real-either' };

// T2/REC-5: the egress gets a put-only MinIO user, never the app's full key (docs/45 §1a).
describe('the egress keys (MINIO_EGRESS_*)', () => {
  it('both set: parsed as the egress key pair; no boot warning', () => {
    const env = storageEnv(loadEnv({ ...BASE, ...MINIO, ...EGRESS }));
    expect(env.egress).toEqual({ accessKey: 'ayat-egress', secretKey: 'not-real-either' });
    expect(egressKeyWarning(env)).toBeNull();
  });

  it('one half missing = unset: the app key is used and the boot warns (names only)', () => {
    const env = storageEnv(loadEnv({ ...BASE, ...MINIO, MINIO_EGRESS_ACCESS_KEY: 'ayat-egress' }));
    expect(env.egress).toBeNull();
    expect(egressKeyWarning(env)).toMatch(/^MINIO_EGRESS_ACCESS_KEY .*app key$/);
    expect(egressKeyWarning(env)).not.toContain('not-a-real-secret');
  });

  it('no MinIO at all: nothing to warn about', () => {
    expect(egressKeyWarning(storageEnv(loadEnv(BASE)))).toBeNull();
  });

  it('a malformed egress access key fails the env schema', () => {
    expect(() => loadEnv({ ...BASE, MINIO_EGRESS_ACCESS_KEY: 'a b' })).toThrow();
  });
});
