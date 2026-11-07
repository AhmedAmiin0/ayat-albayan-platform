import { describe, expect, it } from 'vitest';
import { integrationValueValid } from './checks.js';
import { INTEGRATION_GROUPS, integrationDef, integrationEnum } from './keys.js';

describe('object storage in «التكاملات» (docs/45)', () => {
  it('the driver is a select, supabase first (the default until the cut-over)', () => {
    expect(integrationEnum('STORAGE_DRIVER')).toEqual(['supabase', 'minio']);
    expect(integrationValueValid('STORAGE_DRIVER', 'minio')).toBe(true);
    expect(integrationValueValid('STORAGE_DRIVER', 's3')).toBe(false);
    expect(INTEGRATION_GROUPS.indexOf('storage')).toBe(INTEGRATION_GROUPS.indexOf('stripe') - 1);
  });

  it('the secret key is a Vault secret; the access key is plain', () => {
    expect(integrationDef('MINIO_SECRET_KEY')).toMatchObject({ group: 'storage', secret: true });
    expect(integrationDef('MINIO_ACCESS_KEY')).toMatchObject({ group: 'storage', secret: false });
  });

  it.each([
    ['MINIO_ENDPOINT', 'http://ayat-minio:9000', true],
    ['MINIO_ENDPOINT', 'http://ayat-minio:9000/bucket', false],
    ['MINIO_ENDPOINT', 'http://user:pw@ayat-minio:9000', false],
    ['MINIO_ENDPOINT', 'ftp://ayat-minio', false],
    ['MINIO_ENDPOINT', 'http://ayat-minio:9000/', true],
    ['MINIO_ENDPOINT', 'http://localhost:9000', true],
    // SSRF guard (pre-cut-over review item 8): no IP literal, no unlisted internal host.
    ['MINIO_ENDPOINT', 'http://10.0.0.5:9000', false],
    ['MINIO_ENDPOINT', 'http://169.254.169.254', false],
    ['MINIO_ENDPOINT', 'http://2130706433', false],
    ['MINIO_ENDPOINT', 'http://ayat-api:3000', false],
    ['MINIO_ENDPOINT', 'http://files.example.com', false],
    ['MINIO_ENDPOINT', 'https://10.0.0.5', false],
    ['MINIO_ENDPOINT', 'https://files.example.com', true],
    ['MINIO_PUBLIC_URL', 'https://127.0.0.1:9000', false],
    ['MINIO_PUBLIC_URL', 'https://192.168.1.10', false],
    ['MINIO_PUBLIC_URL', 'https://0x7f000001', false],
    ['MINIO_PUBLIC_URL', 'http://ayat-minio:9000', false],
    ['MINIO_PUBLIC_URL', 'https://files.example.com', true],
    ['MINIO_PUBLIC_URL', 'http://files.example.com', false],
    ['MINIO_PUBLIC_URL', 'http://localhost:9000', true],
    ['MINIO_REGION', 'us-east-1', true],
    ['MINIO_REGION', 'US East', false],
    ['MINIO_BUCKET_PREFIX', 'ab-', true],
    ['MINIO_BUCKET_PREFIX', 'AB_', false],
    ['MINIO_ACCESS_KEY', 'ayat-app', true],
    ['MINIO_ACCESS_KEY', 'a b', false],
  ] as const)('%s = %s → %s', (key, value, ok) => {
    expect(integrationValueValid(key, value)).toBe(ok);
  });
});
