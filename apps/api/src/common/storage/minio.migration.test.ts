import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// docs/45: the MinIO secret joins the Vault allow-list; three path checks accept «minio:». No
// database in unit tests: the SQL is read as text.
const sql = (file: string) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
const secret = sql('20261106001000_minio_storage_secret.sql');
const paths = sql('20261106001001_minio_stored_paths.sql');

describe('MinIO migrations', () => {
  it('the secret key is allowed in Vault, service role only', () => {
    expect(secret).toContain("'EVOLUTION_API_KEY', 'MINIO_SECRET_KEY'");
    expect(secret).toContain(
      'revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;',
    );
  });

  it('each path check reads the path without its marker; expand-only, validated after not valid', () => {
    expect(paths).toContain("attachment_path like 'minio:saved/%'");
    expect(paths).toContain("path ~ '^(minio:)?[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'");
    expect(paths).toContain("split_part(regexp_replace(new.path, '^minio:', ''), '/', 1)");
    expect(paths.match(/regexp_replace\(avatar_path, '\^minio:', ''\)/g)).toHaveLength(3);
    expect(paths.match(/ not valid;/g)).toHaveLength(3);
    expect(paths.match(/validate constraint/g)).toHaveLength(3);
    expect(paths).not.toMatch(/\b(drop table|delete from|update public)\b/i);
  });

  it('the pattern a payment attachment path must match, as the SQL regex reads it', () => {
    const re = /^(minio:)?[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/;
    const folder = '0b1c2d3e-0000-4000-8000-000000000001';
    expect(re.test(`${folder}/a.jpg`)).toBe(true);
    expect(re.test(`minio:${folder}/a.jpg`)).toBe(true);
    expect(re.test(`s3:${folder}/a.jpg`)).toBe(false);
  });
});
